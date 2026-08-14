import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 pb-20 text-center">
      <div className="glass-strong glow-border rounded-3xl p-12">
        <div className="font-display text-7xl font-black text-gradient text-glow">404</div>
        <h1 className="mt-4 font-display text-xl font-bold">{t('404.title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('404.desc')}</p>
        <Link to="/" className="btn-primary mt-8 inline-flex">
          {t('404.back')}
        </Link>
      </div>
    </div>
  );
}
