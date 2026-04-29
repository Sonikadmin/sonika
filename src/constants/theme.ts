export const COLORS = {
  primary: '#7C4DFF',
  primaryLight: '#A57AFF',
  primaryDark: '#5B2ECC',
  secondary: '#00E5C3',
  secondaryDark: '#00B89C',
  accent: '#FF6B6B',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',

  background: '#0D0D1A',
  surface: '#1A1A2E',
  card: '#252540',
  cardHighlight: '#2E2E50',
  border: '#333355',

  text: '#F0F0FF',
  textMuted: '#8888AA',
  textDisabled: '#555577',

  white: '#FFFFFF',
  black: '#000000',

  waveform: '#00E5C3',
  powerOn: '#7C4DFF',
  powerOff: '#444466',
  sonikaCleanActive: '#4CAF50',
  sonikaCleanInactive: '#555577',
  conversationActive: '#FF9800',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',

  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    title: 40,
  },

  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },

  powerButton: 120,
  tabBarHeight: 70,
  headerHeight: 56,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  }),
};
