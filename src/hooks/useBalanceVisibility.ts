import { useCallback, useEffect, useRef, useState } from 'react';
import { loadBalanceHidden, saveBalanceHidden } from '../lib/balanceVisibility';

export function useBalanceVisibility() {
  const [hidden, setHidden] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const touched = useRef(false);

  useEffect(() => {
    let active = true;
    loadBalanceHidden().then((value) => {
      if (!active) return;
      if (!touched.current) setHidden(value);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loaded) saveBalanceHidden(hidden);
  }, [hidden, loaded]);

  const toggle = useCallback(() => {
    touched.current = true;
    setHidden((prev) => !prev);
  }, []);

  return { hidden, toggle };
}
