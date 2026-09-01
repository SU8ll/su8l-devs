import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { Server } from 'node:http';
import { config } from '../config.js';
import { getUser, hasChatEntitlement } from '../db.js';
import jwt from 'jsonwebtoken';
import { resolveAvatarUrl } from './avatars.js';

export interface ChatUser {
  id: string;
  username: string;
  avatar: string | null;
}

export interface ChatMessagePayload {
  id: string;
  user: ChatUser;
  body: string;
  language: string;
  replyTo: {
    id: string;
    body: string;
    username: string;
    userId: string;
  } | null;
  mentionNames: string[];
  createdAt: string;
}

type Client = {
  socket: WebSocket;
  user: ChatUser;
};

const clients = new Set<Client>();

export function chatActiveCount(): number {
  return clients.size;
}

/** Broadcast a serializable payload to every connected chat client. */
export function broadcastChat(payload: unknown): void {
  const raw = JSON.stringify(payload);
  for (const c of clients) {
    if (c.socket.readyState === WebSocket.OPEN) c.socket.send(raw);
  }
}

/** Send a live message to all currently-open chat sockets. */
export function emitChatMessage(msg: ChatMessagePayload): void {
  broadcastChat({ type: 'message', message: msg });
}

export function emitPresence(): void {
  broadcastChat({ type: 'presence', active: clients.size });
}

/** Verifies the ?token= query param (the JWT session) and resolves the user. */
async function authenticate(token: string | undefined): Promise<ChatUser | undefined> {
  if (!token) return undefined;
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub?: string };
    if (!payload.sub) return undefined;
    const user = await getUser(payload.sub);
    if (!user) return undefined;
    // Chat is for paying customers only (active subscriber or completed order).
    if (!(await hasChatEntitlement(user.id))) return undefined;
    return { id: user.id, username: user.username, avatar: resolveAvatarUrl(user.avatar) };
  } catch {
    return undefined;
  }
}

/** Attach the /ws WebSocket server to the Node HTTP server. */
export function attachChatSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (socket, req) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const token = url.searchParams.get('token') ?? undefined;
    const user = await authenticate(token);
    if (!user) {
      socket.close(1011, 'unauthorized');
      return;
    }
    const client: Client = { socket, user };
    clients.add(client);
    emitPresence();
    // Send the freshly-connected client its own greeting/state.
    socket.send(JSON.stringify({ type: 'hello', active: clients.size, me: user }));

    socket.on('message', (raw: RawData) => {
      void handleClientMessage(client, raw);
    });

    socket.on('close', () => {
      clients.delete(client);
      emitPresence();
    });

    socket.on('error', () => {
      clients.delete(client);
    });
  });
}

async function handleClientMessage(client: Client, raw: RawData): Promise<void> {
  try {
    const data = JSON.parse(String(raw)) as { type?: string };
    if (data.type === 'ping') {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify({ type: 'pong' }));
      }
    }
  } catch {
    /* ignore malformed frames */
  }
}
