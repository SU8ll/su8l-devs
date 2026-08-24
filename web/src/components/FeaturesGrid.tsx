import { useI18n } from '../i18n';
import { useScrollReveal } from '../hooks/useScrollReveal';

const CARDS = [1, 2, 3, 4] as const;
const ICONS = ['🏛️', '⛏️', '⚔️', '🏆'];
const GRADIENTS = [
  'from-purple-500/20 to-cyan-500/10',
  'from-amber-500/20 to-orange-500/10',
  'from-red-500/20 to-pink-500/10',
  'from-emerald-500/20 to-teal-500/10',
];

export default function FeaturesGrid() {
  const { t } = useI18n();
  useScrollReveal();

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="reveal mb-10 text-center sm:mb-16">
          <h2 className="mb-4 font-display text-3xl font-extrabold tracking-tight md:text-5xl">
            <span className="text-gradient">{t('features.title')}</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted sm:text-lg">{t('features.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((i, idx) => (
            <div
              key={i}
              className="glass feature-card card-hover reveal group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 sm:p-8"
              style={{ transitionDelay: `${idx * 0.1}s` }}
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[idx]} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />

              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-glow/25 bg-glow/8 transition-all duration-300 group-hover:scale-110 group-hover:border-glow/50 group-hover:bg-glow/15 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                  <span className="text-2xl transition-transform duration-300 group-hover:scale-110">{ICONS[idx]}</span>
                </div>
                <h3 className="mb-3 text-xl font-bold transition-colors duration-300 group-hover:text-glow-bright">{t(`feature.${i}t`)}</h3>
                <p className="text-sm leading-relaxed text-muted">{t(`feature.${i}d`)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="reveal mt-16 text-center">
          <span className="inline-block rounded-full border border-glow/25 bg-glow/5 px-8 py-3 text-sm font-medium tracking-wide text-glow shadow-[0_0_30px_rgba(168,85,247,0.12)]">
            {t('features.more')}
          </span>
        </div>
      </div>
    </section>
  );
}
