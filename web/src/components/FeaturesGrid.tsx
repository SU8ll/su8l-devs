import { useI18n } from '../i18n';

const CARDS = [1, 2, 3, 4] as const;
const ICONS = ['🏛️', '⛏️', '⚔️', '🏆'];

export default function FeaturesGrid() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center sm:mb-16">
          <h2 className="mb-4 bg-gradient-to-r from-purple-400 via-purple-200 to-white bg-clip-text font-display text-3xl font-extrabold tracking-tight text-transparent md:text-5xl">
            {t('features.title')}
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted sm:text-lg">{t('features.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((i, idx) => (
            <div
              key={i}
              className="glass glow-border card-hover fade-up group relative rounded-2xl p-6 transition-all duration-300 hover:border-glow/50 sm:p-8"
              style={{ animationDelay: `${idx * 0.07}s` }}
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-glow/30 bg-glow/10 transition-transform duration-300 group-hover:scale-110">
                <span aria-hidden="true">{ICONS[idx]}</span>
              </div>
              <h3 className="mb-3 text-xl font-bold">{t(`feature.${i}t`)}</h3>
              <p className="text-sm leading-relaxed text-muted">{t(`feature.${i}d`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <span className="inline-block rounded-full border border-glow/30 bg-glow/10 px-6 py-2.5 text-sm font-medium tracking-wide text-glow shadow-[0_0_20px_rgba(111,66,193,0.2)]">
            {t('features.more')}
          </span>
        </div>
      </div>
    </section>
  );
}
