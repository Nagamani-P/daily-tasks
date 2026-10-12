export const colors = {
  bg: '#F5F2EC',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEBE3',
  ink: '#1D2626',
  inkSoft: '#4A5555',
  muted: '#7E8786',
  line: '#E4DED3',
  accent: '#2E6B5A',
  accentSoft: '#DCEAE4',
  accentInk: '#FFFFFF',
  soft: '#F3E3BF', // carried 1 day
  softInk: '#7A5A14',
  warn: '#F0C987', // carried 2-3 days
  warnInk: '#6B4708',
  alert: '#F2C2B4', // carried 4+ days
  alertInk: '#8C2E17',
  danger: '#B4442B',
  missed: '#C9C2B6',
  overlay: 'rgba(20, 26, 26, 0.38)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

export const type = {
  display: { fontSize: 28, fontWeight: '700' as const, color: colors.ink, letterSpacing: -0.4 },
  title: { fontSize: 20, fontWeight: '700' as const, color: colors.ink },
  label: { fontSize: 12, fontWeight: '700' as const, color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' as const },
  body: { fontSize: 16, color: colors.ink },
  small: { fontSize: 13, color: colors.muted },
};
