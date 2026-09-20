import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { motion } from '../theme/motion';

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  style?: TextStyle | TextStyle[];
}

export function AnimatedNumber({ value, format, style }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;

    if (reduceMotion || from === value) {
      setDisplay(value);
      return;
    }

    const start = Date.now();
    const duration = motion.duration.value;
    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, reduceMotion]);

  return <Text style={style}>{format(display)}</Text>;
}
