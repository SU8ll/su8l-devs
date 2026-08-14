import type { ReactNode } from 'react';

export function Kicker({ children }: { children: ReactNode }) {
  return <div className="section-kicker mb-4">{children}</div>;
}

export function Badge({ children, tone = 'purple' }: { children: ReactNode; tone?: 'purple' | 'green' | 'amber' | 'red' | 'slate' }) {
  const tones: Record<string, string> = {
    purple: 'border-glow/40 bg-glow/10 text-glow',
    green: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
    amber: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
    red: 'border-red-400/40 bg-red-400/10 text-red-300',
    slate: 'border-white/15 bg-white/5 text-muted',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-glow/30 border-t-glow"
      style={{ width: size, height: size }}
    />
  );
}

export function formatDate(epoch: number | null): string {
  if (!epoch) return '—';
  return new Date(epoch).toLocaleDateString();
}

export function formatDateFull(epoch: number | null): string {
  if (!epoch) return '—';
  return new Date(epoch).toLocaleString();
}
