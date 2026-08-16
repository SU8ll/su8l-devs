import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, apiUrl, type MeDto } from './api';
import { clearStoredToken } from './pages/AuthCallback';

interface AuthContextValue {
  user: MeDto | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  loginUrl: (provider: 'discord' | 'google' | 'facebook') => string;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
  loginUrl: () => apiUrl('/api/auth/discord'),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeDto | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api<MeDto>('/api/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    clearStoredToken();
    setUser(null);
  }, []);

  const loginUrl = useCallback(
    (provider: 'discord' | 'google' | 'facebook') => apiUrl(`/api/auth/${provider}`),
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, refresh, logout, loginUrl }),
    [user, loading, refresh, logout, loginUrl]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
