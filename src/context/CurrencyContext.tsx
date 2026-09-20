import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { currencyDecimalsFor, currencySymbolFor } from '../utils/format';

interface CurrencyContextType {
  currency: string;
  symbol: string;
  decimals: number;
  setCurrency: (currency: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('USD ($)');

  const setCurrency = useCallback((next: string) => {
    setCurrencyState(next);
  }, []);

  const symbol = useMemo(() => currencySymbolFor(currency), [currency]);
  const decimals = useMemo(() => currencyDecimalsFor(currency), [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, symbol, decimals, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
