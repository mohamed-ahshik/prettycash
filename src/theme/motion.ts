export const motion = {
  duration: {
    micro: 110,
    selection: 200,
    sheetIn: 320,
    sheetOut: 240,
    screen: 220,
    value: 450,
    sweep: 650,
    enter: 180,
    exit: 140,
  },
  spring: {
    press: { damping: 26, stiffness: 400, mass: 0.7 },
    sheet: { damping: 24, stiffness: 220, mass: 0.8 },
    thumb: { damping: 30, stiffness: 350, mass: 0.7 },
  },
  stagger: 35,
} as const;
