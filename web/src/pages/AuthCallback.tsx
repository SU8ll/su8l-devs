import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../components/ui';
import { useAuth } from '../AuthContext';

const TOKEN_KEY = 'su8l_token';

export function readStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    if (token) {
      storeToken(token);
    }
    void refresh().finally(() => navigate('/dashboard', { replace: true }));
  }, [navigate, refresh]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size={36} />
    </div>
  );
}
