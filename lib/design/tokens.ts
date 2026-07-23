/**
 * MindWrestle — design tokens (ETAP 1 foundation).
 * CSS mirror: --cm-* variables in app/globals.css
 */
export const designTokens = {
  dark: {
    base: "#140C07",
    mid: "#1E120B",
    layer: "#2A170D",
  },
  parchment: {
    light: "#E7D7BA",
    mid: "#D8C6A4",
    shadow: "#CBB28D",
  },
  wood: {
    mid: "#6D4427",
    dark: "#59351E",
    deep: "#3F2415",
  },
  brass: {
    gold: "#C6A15D",
    dark: "#A57C3E",
    highlight: "#E0C187",
  },
  magic: {
    teal: "#4F897D",
    tealLight: "#6DB0A4",
    glow: "#8ED8C7",
    amber: "#F0C275",
  },
  mood: {
    trust: "#D3B15B",
    suspicion: "#B97957",
    patience: "#7EA88D",
  },
  ink: {
    main: "#2A1608",
    soft: "#4A2E18",
    muted: "#5C3A22",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "18px",
  },
} as const;

export type ButtonTone = "primary" | "secondary" | "wood" | "icon";
