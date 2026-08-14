import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

export default function CheckoutCancel() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 pb-20 text-center">
      <div className="glass-strong glow-border rounded-3xl p-10">
        <div className="text-4xl">🚫</div>
        <h1 className="mt-4 font-display text-xl font-bold">{t('checkout.cancel')}</h1>
        <Link to="/pricing" className="btn-primary mt-8 inline-flex">
          {t('checkout.backPricing')}
        </Link>
      </div>
    </div>
  );
}
