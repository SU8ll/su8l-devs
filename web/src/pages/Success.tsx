import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api, type OrderSummaryDto } from '../api';
import { Spinner } from '../components/ui';

export default function Success() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const orderId = params.get('order');
  const [order, setOrder] = useState<OrderSummaryDto | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<number | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setError(t('success.missingOrder'));
      return;
    }
    try {
      const o = await api<OrderSummaryDto>(`/api/checkout/orders/${orderId}`);
      setOrder(o);
      if (o.status === 'completed') {
        setDone(true);
        if (timer.current) window.clearInterval(timer.current);
      }
    } catch {
      setError(t('success.loadError'));
    }
  }, [orderId, t]);

  useEffect(() => {
    void fetchOrder();
    timer.current = window.setInterval(() => void fetchOrder(), 2500);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [fetchOrder]);

  const whatsappMessage = order
    ? [
        'Hello SU8L DEVs \u26A1',
        'I have successfully purchased the Cloud Bot Service.',
        `\u25A0 Order ID: #${order.id}`,
        `\u25A0 Plan: ${order.plan}`,
        `\u25A0 Discord User: ${order.discordUsername ?? '—'}`,
        'I am ready to provide my game account details securely.',
      ].join('\n')
    : '';

  const whatsappLink =
    order && order.whatsapp ? `https://wa.me/${order.whatsapp}?text=${encodeURIComponent(whatsappMessage)}` : '';

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <div className="glass-strong glow-border fade-up w-full rounded-3xl p-8 text-center sm:p-12">
          {!done && !error ? (
            <div className="py-12">
              <div className="flex justify-center">
                <Spinner size={44} />
              </div>
              <h1 className="mt-6 font-display text-xl font-bold">{t('success.processing')}</h1>
              <p className="mt-2 text-sm text-muted">{t('success.notReady')}</p>
            </div>
          ) : error ? (
            <div className="py-12">
              <div className="text-4xl">⚠️</div>
              <h1 className="mt-4 font-display text-xl font-bold text-red-300">{error}</h1>
              <Link to="/pricing" className="btn-primary mt-8 inline-flex">
                {t('checkout.backPricing')}
              </Link>
            </div>
          ) : order ? (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-500/20 shadow-[0_0_50px_rgba(52,211,153,0.45)]">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="mt-6 font-display text-3xl font-black text-gradient text-glow">{t('success.title')}</h1>
              <p className="mt-2 text-muted">{t('success.subtitle')}</p>

              <div className="mt-8 grid gap-3 text-start">
                <DetailRow label={t('success.orderId')} value={`#${order.id}`} mono />
                <DetailRow label={t('success.plan')} value={order.plan} />
                <DetailRow label={t('success.discord')} value={order.discordUsername ?? '—'} />
                <DetailRow label={t('checkout.amount')} value={`$${order.amount} ${order.currency}`} />
              </div>

              <div className="mt-8 rounded-2xl border border-glow/20 bg-glow/5 p-5 text-start">
                <div className="text-xs font-bold uppercase tracking-wider text-glow">{t('success.nextStep')}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t('success.whatsappNote')}</p>
              </div>

              {whatsappLink ? (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="btn-wa mt-6 w-full">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.2-3.3-.7a11.6 11.6 0 0 1-4.6-4.1c-.5-.9-.6-1.4-.8-2-.2-.6-.1-1.4.1-2 .1-.4.6-.9 1.2-1 .3 0 .6 0 .8 0 .3 0 .6 0 .9.7.1.4.4 1 .5 1.1.1.1.1.2 0 .4l-.4.6c-.1.2-.3.3-.1.6.2.4.9 1.6 2 2.5 1.3 1.1 2 1.4 2.3 1.5.2.1.4.1.5-.1l.7-.9c.2-.2.3-.2.6-.1l1.6.8c.2.1.4.2.4.3 0 .1 0 .5-.2 1z" />
                  </svg>
                  {t('success.whatsapp')}
                </a>
              ) : (
                <div className="btn-wa mt-6 w-full cursor-not-allowed opacity-50">
                  {t('success.waNotConfigured')}
                </div>
              )}

              <div className="mt-4 text-xs text-muted">🛡 {t('success.secure')}</div>

              <Link to="/dashboard" className="btn-ghost mt-8 w-full">
                {t('success.dashboard')}
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className={`font-semibold ${mono ? 'font-mono text-glow' : ''}`}>{value}</span>
    </div>
  );
}
