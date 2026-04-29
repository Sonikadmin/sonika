export const COLORS = {
  primary: '#7C4DFF',
  primaryLight: '#A57AFF',
  primaryDark: '#5B2ECC',
  secondary: '#00E5C3',
  secondaryDark: '#00B89C',
  cyan: '#00CCFF',
  cyanDark: '#0099CC',
  accent: '#FF6B6B',
  success: '#00E676',
  warning: '#FF9800',
  error: '#F44336',

  background: '#080B1A',
  surface: '#0D1030',
  card: '#111435',
  cardHighlight: '#181D45',
  border: '#1E2448',

  text: '#E8EEFF',
  textMuted: '#6A7290',
  textDisabled: '#3A3F60',

  white: '#FFFFFF',
  black: '#000000',

  waveform: '#00CCFF',
  powerOn: '#7C4DFF',
  powerOff: '#2A2D50',
  sonikaCleanActive: '#00E676',
  sonikaCleanInactive: '#3A3F60',
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
