import { useEffect, useState } from 'react';
import { getAvatars, setMyAvatar, type AvatarItemDto } from '../api';
import { useI18n } from '../i18n';
import { Spinner } from './ui';

interface AvatarPickerProps {
  open: boolean;
  current: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AvatarPicker({ open, current, onClose, onSaved }: AvatarPickerProps) {
  const { t } = useI18n();
  const [avatars, setAvatars] = useState<AvatarItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(true);
    getAvatars()
      .then((r) => setAvatars(r.avatars))
      .catch(() => setError(t('avatar.loadError')))
      .finally(() => setLoading(false));
  }, [open, t]);

  if (!open) return null;

  const pick = async (file: string) => {
    setSaving(true);
    setError('');
    try {
      await setMyAvatar(file);
      onSaved();
      onClose();
    } catch {
      setError(t('avatar.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-lg rounded-3xl border border-white/10 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{t('avatar.title')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-white"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">{t('avatar.subtitle')}</p>

        <div className="mt-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size={28} />
            </div>
          ) : avatars.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{t('avatar.empty')}</p>
          ) : (
            <div className="grid max-h-[50vh] grid-cols-3 gap-4 overflow-y-auto sm:grid-cols-4">
              {avatars.map((a) => {
                const selected = a.url === current;
                return (
                  <button
                    key={a.file}
                    type="button"
                    disabled={saving}
                    onClick={() => pick(a.file)}
                    className={`avatar-glow group relative overflow-hidden rounded-full border-2 transition-all ${
                      selected ? 'border-glow' : 'border-transparent hover:border-white/40'
                    }`}
                    title={a.file}
                  >
                    <img src={a.url} alt="" className="h-20 w-20 object-cover" />
                    {selected && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
