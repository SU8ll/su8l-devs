import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api } from '../api';
import { Spinner } from '../components/ui';

export default function CheckoutReturn() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = params.get('token');
    if (!token) {
      setError('No payment token in URL.');
      return;
    }
    api<{ orderId: string; status: string }>('/api/checkout/capture', {
      method: 'POST',
      body: { paypalOrderId: token },
    })
      .then((res) => navigate(`/success?order=${res.orderId}`, { replace: true }))
      .catch((e) => setError(e instanceof Error ? e.message : 'Capture failed'));
  }, [params, navigate]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 pb-20 text-center">
      <div className="glass-strong glow-border rounded-3xl p-10">
        {error ? (
          <>
            <div className="text-4xl">⚠️</div>
            <h1 className="mt-4 font-display text-xl font-bold text-red-300">{t('checkout.cancel')}</h1>
            <p className="mt-2 text-sm text-muted">{error}</p>
            <button type="button" className="btn-primary mt-8" onClick={() => navigate('/pricing')}>
              {t('checkout.backPricing')}
            </button>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <Spinner size={40} />
            </div>
            <h1 className="mt-6 font-display text-lg font-bold">{t('return.capturing')}</h1>
          </>
        )}
      </div>
    </div>
  );
}
