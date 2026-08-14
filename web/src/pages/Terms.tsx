import { useI18n } from '../i18n';
import { Kicker } from '../components/ui';

const SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];

export default function Terms() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <div className="pt-12 text-center">
        <Kicker>{t('nav.terms')}</Kicker>
        <h1 className="font-display text-3xl font-black text-gradient">{t('terms.title')}</h1>
      </div>

      <div className="glass-strong mt-10 rounded-3xl p-8 sm:p-10">
        <p className="text-sm leading-relaxed text-muted">{t('terms.intro')}</p>
        <div className="mt-8 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s}>
              <h2 className="font-display text-lg font-bold text-glow">{t(`terms.${s}t`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/85">{t(`terms.${s}d`)}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 border-t border-white/10 pt-5 text-xs text-muted">
          {t('terms.foot')}: {new Date().toLocaleDateString()} · su8ldevs.eu.cc
        </div>
      </div>
    </div>
  );
}
