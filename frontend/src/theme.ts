// Design tokens for Portimão '26 – Família Sacramento
// Palette: warm Algarve teal + terracotta on sun-drenched off-white.
export const colors = {
  surface: "#FDFBF7",
  surfaceSecondary: "#FFFFFF",
  surfaceTertiary: "#F0ECE1",
  surfaceInverse: "#1C1C1E",
  onSurface: "#1C1C1E",
  onSurfaceMuted: "#6B6B6F",
  onSurfaceSecondary: "#1C1C1E",
  onSurfaceTertiary: "#3A3A3C",
  onSurfaceInverse: "#FDFBF7",
  brand: "#1D8086",
  brandDark: "#114D50",
  brandPrimary: "#1D8086",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#D96C4E",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E2F1F2",
  onBrandTertiary: "#114D50",
  brandTerracottaSoft: "#FBE7DE",
  onBrandTerracottaSoft: "#8A3A22",
  sun: "#F4A261",
  sunSoft: "#FCE9CE",
  success: "#2A9D8F",
  warning: "#F4A261",
  error: "#E76F51",
  info: "#457B9D",
  border: "#E5E5EA",
  borderStrong: "#C7C7CC",
  divider: "#E5E5EA",
  overlayDark: "rgba(28,28,30,0.55)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  displayLg: { fontSize: 32, fontWeight: "700" as const, letterSpacing: -0.5 },
  displayMd: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3 },
  h1: { fontSize: 22, fontWeight: "700" as const },
  h2: { fontSize: 20, fontWeight: "700" as const },
  h3: { fontSize: 17, fontWeight: "600" as const },
  bodyLg: { fontSize: 16, fontWeight: "400" as const },
  body: { fontSize: 14, fontWeight: "400" as const },
  bodyBold: { fontSize: 14, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "500" as const },
  overline: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1 },
};

export const shadows = {
  soft: {
    shadowColor: "#1C1C1E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  medium: {
    shadowColor: "#1C1C1E",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 6,
  },
};

export const images = {
  hero: "https://images.unsplash.com/photo-1655992943809-02cefc9e1326?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2ODh8MHwxfHNlYXJjaHw0fHxQb3J0aW1hbyUyMGJlYWNoJTIwQWxnYXJ2ZXxlbnwwfHx8fDE3ODM2MDY5ODB8MA&ixlib=rb-4.1.0&q=85",
  benagil: "https://images.unsplash.com/photo-1601999114487-fac7c37ecd94?auto=format&fit=crop&w=1400&q=80",
  praia: "https://images.unsplash.com/photo-1509233725247-49e657c54213?auto=format&fit=crop&w=1400&q=80",
  kidsBeach: "https://images.pexels.com/photos/25695907/pexels-photo-25695907.jpeg",
  restaurant: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  marina: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80",
};

export const TRIP_START_ISO = "2026-07-12T16:05:00+01:00";
