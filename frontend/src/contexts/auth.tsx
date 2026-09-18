import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  clearTokens,
  fetchMe,
  googleLogin as apiGoogleLogin,
  loadStoredTokens,
  login as apiLogin,
  register as apiRegister,
  RegisterInput,
  User,
} from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const tokens = await loadStoredTokens();
      if (tokens) {
        try {
          setUser(await fetchMe());
        } catch {
          await clearTokens();
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    setUser(await fetchMe());
  }, []);

  const googleLogin = useCallback(async (idToken: string) => {
    await apiGoogleLogin(idToken);
    setUser(await fetchMe());
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await apiRegister(input);
    setUser(await fetchMe());
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await fetchMe());
    } catch {
      // token may have expired
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, googleLogin, register, logout, refreshUser }),
    [user, loading, login, googleLogin, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}