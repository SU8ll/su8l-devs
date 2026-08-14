import 'dotenv/config';
import { createServer } from 'node:http';
import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  type Interaction,
} from 'discord.js';
import axios from 'axios';

const token = process.env.DISCORD_BOT_TOKEN || '';
const ownerId = process.env.OWNER_DISCORD_ID || '';
const botApiKey = process.env.BOT_API_KEY || '';
const botPort = Number(process.env.BOT_PORT || 4001);
const paidRoleId = process.env.PAID_ROLE_ID || '';
const apiUrl = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
const guildIds = (process.env.GUILD_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!token) {
  console.error('DISCORD_BOT_TOKEN is not set');
  process.exit(1);
}
if (!ownerId) {
  console.error('OWNER_DISCORD_ID is not set — /su8l_promo will refuse everyone and config DMs will be skipped.');
}

async function generatePromoViaApi(): Promise<{ code: string }> {
  const res = await axios.post(`${apiUrl}/api/bot/promo`, null, {
    headers: { 'x-bot-key': botApiKey },
    timeout: 10_000,
  });
  return res.data as { code: string };
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// Resolves once the bot is connected so /dispatch actions never race login.
let markReady: () => void;
const readyPromise = new Promise<void>((resolve) => {
  markReady = resolve;
});

// ── HTTP callback — the API dispatches Cloud Configurator DMs + role grants ──
function startDispatchServer() {
  const server = createServer(async (req, res) => {
    const send = (code: number, body: unknown) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (req.method !== 'POST' || !req.url?.startsWith('/dispatch')) {
      return send(404, { error: 'not found' });
    }
    const key = req.headers['x-bot-key'];
    if (!key || key !== botApiKey) {
      return send(401, { error: 'invalid bot key' });
    }

    let raw = '';
    for await (const chunk of req) raw += chunk;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw || '{}');
    } catch {
      return send(400, { error: 'malformed payload' });
    }

    try {
      await readyPromise;

      switch (payload.type) {
        case 'cloud_config': {
          const message = typeof payload.message === 'string' ? payload.message : '';
          if (!ownerId) return send(200, { ok: true, skipped: 'OWNER_DISCORD_ID not set' });
          if (!message) return send(400, { error: 'message required' });
          const owner = await client.users.fetch(ownerId);
          await owner.send({
            content: message,
            flags: [1 << 12], // SuppressNotifications for a quiet DM
          });
          console.log(`[dispatch] config DM sent to owner (${String(payload.discordUsername ?? 'unknown')})`);
          return send(200, { ok: true });
        }

        case 'grant_role': {
          const discordId = typeof payload.discordId === 'string' ? payload.discordId : '';
          if (!discordId) return send(400, { error: 'discordId required' });
          if (!paidRoleId) return send(200, { ok: true, skipped: 'PAID_ROLE_ID not set' });
          let granted = false;
          for (const gid of guildIds) {
            try {
              const guild = await client.guilds.fetch(gid);
              const member = await guild.members.fetch(discordId).catch(() => null);
              if (member) {
                await member.roles.add(paidRoleId);
                granted = true;
                console.log(`[dispatch] granted paid role to ${member.user.tag} in ${gid}`);
              }
            } catch (err) {
              console.error(`[dispatch] grant_role failed in ${gid}`, err);
            }
          }
          return send(granted ? 200 : 202, {
            ok: true,
            granted,
            note: granted ? undefined : 'member not found in any configured guild (or role already assigned)',
          });
        }

        default:
          return send(400, { error: 'unknown dispatch type' });
      }
    } catch (err) {
      console.error('[dispatch]', err);
      return send(500, { error: 'dispatch failed' });
    }
  });

  server.listen(botPort, () => {
    console.log(`[SU8L Bot] dispatch listener on :${botPort}`);
  });
}

client.once(Events.ClientReady, async (c) => {
  console.log(`[SU8L Bot] logged in as ${c.user.tag}`);
  markReady();

  const command = new SlashCommandBuilder()
    .setName('su8l_promo')
    .setDescription('Generate a single-use SU8L promo code (Owner only).')
    .setDMPermission(false);

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    if (guildIds.length > 0) {
      for (const gid of guildIds) {
        await rest.put(Routes.applicationGuildCommands(c.user.id, gid), { body: [command.toJSON()] });
        console.log(`[SU8L Bot] command registered in guild ${gid}`);
      }
    } else {
      await rest.put(Routes.applicationCommands(c.user.id), { body: [command.toJSON()] });
      console.log('[SU8L Bot] command registered globally (may take up to 1h to propagate)');
    }
  } catch (err) {
    console.error('[SU8L Bot] failed to register commands', err);
  }
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'su8l_promo') return;

  // STRICT owner lock — no one else can execute this command.
  if (interaction.user.id !== ownerId) {
    await interaction.reply({
      content: '⛔ You do not have permission to use this command. Only the SU8L DEVs owner can generate promo codes.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    const { code } = await generatePromoViaApi();
    await interaction.editReply({
      content: [
        '✅ **Promo code generated**',
        `\`${code}\``,
        '',
        '• Status: `unused`',
        '• Forces the **Elite** (highest tier) plan down to **$25/month**.',
        '• The **$15 Extra Account Slot** is never discounted.',
        '• Marked `used` instantly on successful PayPal capture.',
      ].join('\n'),
    });
  } catch (err) {
    console.error('[su8l_promo]', err);
    await interaction.editReply({
      content: '❌ Failed to generate a promo code. Check the API connection and `BOT_API_KEY`.',
    });
  }
});

startDispatchServer();
client.login(token);
