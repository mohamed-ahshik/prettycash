import { TextStyle } from 'react-native';
import { fonts } from './typography';

export const text: Record<
  | 'display'
  | 'title'
  | 'heading'
  | 'subhead'
  | 'bodyLg'
  | 'body'
  | 'label'
  | 'caption'
  | 'overline'
  | 'money',
  TextStyle
> = {
  display: { fontSize: 40, lineHeight: 44, fontFamily: fonts.bold, letterSpacing: -1 },
  title: { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold, letterSpacing: -0.6 },
  heading: { fontSize: 20, lineHeight: 26, fontFamily: fonts.bold, letterSpacing: -0.3 },
  subhead: { fontSize: 16, lineHeight: 22, fontFamily: fonts.semibold, letterSpacing: -0.1 },
  bodyLg: { fontSize: 15, lineHeight: 21, fontFamily: fonts.semibold },
  body: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  label: { fontSize: 13, lineHeight: 18, fontFamily: fonts.semibold },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.medium },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  money: { fontVariant: ['tabular-nums'] },
};
