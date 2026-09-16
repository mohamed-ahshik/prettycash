import React, { createContext, useContext, useState } from 'react';

interface MonthContextType {
  month: number;
  year: number;
  setMonth: (month: number, year: number) => void;
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [month, setMonthState] = useState(() => new Date().getMonth());
  const [year, setYearState] = useState(() => new Date().getFullYear());

  const setMonth = (nextMonth: number, nextYear: number) => {
    setMonthState(nextMonth);
    setYearState(nextYear);
  };

  return (
    <MonthContext.Provider value={{ month, year, setMonth }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useMonth must be used within MonthProvider');
  return ctx;
}
