import { Link } from 'react-router-dom';

export default function DeveloperProfile() {
  return (
    <div className="min-h-screen bg-[#05051a] relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-[#7c3aed]/15 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[560px] w-[560px] rounded-full bg-[#a855f7]/10 blur-[90px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#22d3ee]/5 blur-[100px]" />

      <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
          <span>←</span> Back to Home
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Left — Profile */}
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#121229] to-[#0b0b1f] p-6 shadow-[0_24px_60px_rgba(0,0,0,.5)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/10 via-transparent to-[#22d3ee]/5" />
            <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#a855f7]/10 blur-3xl" />
            <div className="relative">
              <div className="relative mx-auto h-40 w-40">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a855f7] blur-[18px] opacity-40" />
                <img
                  src="/developer/su8l-pfp.jpeg"
                  alt="Fahad — Founder of SU8L DEVs"
                  className="relative h-40 w-40 rounded-full object-cover border-[3px] border-white/10 shadow-[0_12px_32px_rgba(0,0,0,.5)]"
                />
                <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1a1a2e] border border-white/10 text-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" />
                </span>
              </div>
              <div className="mt-5 text-center">
                <h1 className="font-display text-[22px] font-black tracking-tight text-white">Fahad</h1>
                <p className="mt-1 text-sm font-semibold tracking-widest text-white/60">ffjj</p>
                <a
                  href="https://steamcommunity.com/profiles/76561199123456789"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#5865F2] px-5 py-2 text-sm font-bold text-white shadow-[0_8px_20px_rgba(88,101,242,.35)] hover:brightness-110 transition"
                >
                  <span className="text-base">💬</span> Message
                </a>
                <div className="mt-6 rounded-2xl bg-white/[0.04] border border-white/5 px-4 py-3 text-left">
                  <div className="text-[11px] font-bold tracking-[0.14em] text-white/40 uppercase">Member Since</div>
                  <div className="mt-1 text-sm font-bold text-white">Apr 17, 2019</div>
                  <div className="mt-3 h-px bg-white/5" />
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> Founder • SU8L DEVs
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Details */}
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#121229] p-7 sm:p-8">
              <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/10 to-transparent" />
              <div className="absolute right-6 top-6 h-20 w-20 opacity-[0.08]">
                <img src="/developer/su8l-logo.webp" alt="" className="h-full w-full object-contain" />
              </div>
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold tracking-widest text-white/70 uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#a855f7]" /> SU8L DEVs
                </div>
                <h2 className="mt-4 font-display text-[26px] font-black leading-tight text-white">Founder of SU8L DEVs</h2>
                <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-white/60">
                  — We build what people need.<br />
                  We turn ideas into reality.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="mailto:fahad@su8ldevs.eu.cc" className="rounded-full bg-white text-[#0b0b1f] px-5 py-2.5 text-sm font-black hover:bg-white/90 transition">Contact Founder</a>
                  <Link to="/pricing" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-white hover:bg-white/[0.08] transition">View Products</Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { platform: 'Steam', handle: 'its me SU8L!', img: '/developer/steam-its-me-su8l.webp', href: 'https://steamcommunity.com/id/su8l' },
                { platform: 'Xbox', handle: 'SU8L', img: '/developer/su8l-xbox.webp', href: 'https://www.xbox.com/en-US/play/user/SU8L' },
                { platform: 'PlayStation', handle: 'x6LTK', img: '/developer/playstation-x6ltk.webp', href: 'https://psnprofiles.com/x6LTK' },
                { platform: 'PayPal', handle: 'U5E5', img: '/developer/paypal-u5e5.webp', href: 'https://paypal.me/su8l' },
              ].map((p) => (
                <a
                  key={p.platform}
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#121229] p-4 hover:border-[#a855f7]/40 hover:bg-[#171733] transition"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/0 to-[#a855f7]/0 group-hover:from-[#7c3aed]/10 group-hover:to-transparent transition" />
                  <div className="relative flex items-center gap-4">
                    <img src={p.img} alt={p.platform} className="h-12 w-12 rounded-xl object-cover border border-white/10 bg-white/[0.04]" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold tracking-widest text-white/40 uppercase">{p.platform}</div>
                      <div className="mt-1 truncate font-mono text-[13px] font-black text-white group-hover:text-[#a78bfa] transition">{p.handle}</div>
                    </div>
                    <span className="ml-auto text-white/20 group-hover:text-white/60 transition">↗</span>
                  </div>
                </a>
              ))}
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 text-center text-xs leading-relaxed text-white/40">
              Crafted with precision for distinguished clients — technology that dazzles, not merely functions.
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-white/25">© 2026 SU8L DEVs — All rights reserved. Founder: Fahad (ffjj)</div>
      </div>
    </div>
  );
}
