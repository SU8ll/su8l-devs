export default function UptimeChart({
  history,
  height = 160,
}: {
  history: { day: string; ok: number; total: number; latency: number | null }[];
  height?: number;
}) {
  if (!history || history.length === 0) {
    return <div className="h-40 w-full rounded-xl border border-white/5 bg-white/[0.02]" />;
  }

  const W = 900;
  const H = height;
  const pad = 6;
  const n = history.length;
  const bw = (W - pad * 2) / n;
  const barGap = Math.max(2, Math.min(4, bw * 0.35));
  const bh = (day: { ok: number; total: number }) =>
    day.total === 0 ? 0.06 : Math.max(0.06, day.ok / day.total);

  const colorFor = (day: { ok: number; total: number }) => {
    if (day.total === 0) return 'rgba(168,85,247,0.25)';
    const pct = day.ok / day.total;
    if (pct === 1) return '#a855f7';
    if (pct >= 0.98) return '#d946ef';
    if (pct >= 0.9) return '#f59e0b';
    return '#ef4444';
  };

  const labelEvery = Math.max(1, Math.ceil(n / 8));
  const labels = history
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % labelEvery === 0 || i === n - 1);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full" role="img" aria-label="30-day uptime chart">
        {labels.map(({ d, i }) => (
          <text
            key={i}
            x={pad + i * bw + bw / 2}
            y={H + 16}
            textAnchor="middle"
            fontSize={12}
            fill="rgba(155,150,176,0.8)"
          >
            {d.day.slice(5)}
          </text>
        ))}
        {[0, 1].map((r) => (
          <line
            key={r}
            x1={pad}
            x2={W - pad}
            y1={H * (r ? 0.5 : 1)}
            y2={H * (r ? 0.5 : 1)}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="4 6"
          />
        ))}
        {history.map((day, i) => {
          const x = pad + i * bw;
          const ratio = bh(day);
          const barH = Math.max(3, ratio * H);
          const y = H - barH;
          return (
            <g key={day.day}>
              <title>{`${day.day}: ${day.total === 0 ? 'no data' : `${Math.round((day.ok / day.total) * 100)}% up`}`}</title>
              <rect
                x={x + barGap / 2}
                y={y}
                width={Math.max(2, bw - barGap)}
                height={barH}
                rx={2}
                fill={colorFor(day)}
                opacity={0.9}
              />
              {barH < 4 && (
                <rect x={x + barGap / 2} y={H - 4} width={Math.max(2, bw - barGap)} height={4} rx={2} fill={colorFor(day)} opacity={0.4} />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-glow" /> 100%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-fuchsia-400" /> ≥98%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-amber-400" /> ≥90%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-red-400" /> &lt;90%
        </span>
      </div>
    </div>
  );
}
