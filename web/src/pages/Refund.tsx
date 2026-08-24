import { useI18n } from '../i18n';

const SECTIONS = ['s1', 's2', 's3', 's4', 's5'];

export default function Refund() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <div className="pt-12 text-center">
        <h1 className="font-display text-3xl font-black text-gradient">{t('refund.title')}</h1>
      </div>

      <div className="glass-strong mt-10 rounded-3xl p-8 sm:p-10">
        <p className="text-sm leading-relaxed text-muted">{t('refund.intro')}</p>
        <div className="mt-8 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s}>
              <h2 className="font-display text-lg font-bold text-glow">{t(`refund.${s}t`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/85">{t(`refund.${s}d`)}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-red-400/25 bg-red-400/5 p-5 text-sm text-red-200/90">
          ⚠ {t('refund.s1d')}
        </div>
        <div className="mt-5 border-t border-white/10 pt-5 text-xs text-muted">{t('refund.foot')}</div>
      </div>
    </div>
  );
}
