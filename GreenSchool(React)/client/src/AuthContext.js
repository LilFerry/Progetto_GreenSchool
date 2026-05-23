import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'greenschool_utente';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utente, setUtente] = useState(null);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setUtente(JSON.parse(raw));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setCaricamento(false);
    }
  }, []);

  const login = (datiUtente) => {
    setUtente(datiUtente);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datiUtente));
  };

  const logout = () => {
    setUtente(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      utente,
      caricamento,
      isAdmin: Boolean(utente?.is_admin),
      login,
      logout,
    }),
    [utente, caricamento]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth va usato dentro AuthProvider');
  }
  return ctx;
}
