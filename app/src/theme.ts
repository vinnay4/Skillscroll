import type { Category } from './types';

export const colors = {
  background: '#0B0B12',
  surface: '#16161F',
  surfaceElevated: '#1E1E2A',
  border: '#2A2A38',
  primary: '#6366F1',
  primaryDim: '#4338CA',
  accent: '#F59E0B',
  text: '#F4F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  success: '#22C55E',
  error: '#EF4444',
  gold: '#FBBF24',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.6)',
};

/** Category tag colors per PRD 8.2 */
export const categoryColors: Record<Category, string> = {
  finance: '#6366F1',
  technology: '#3B82F6',
  communication: '#10B981',
  productivity: '#F59E0B',
};

export const categoryLabels: Record<Category, string> = {
  finance: 'Finance',
  technology: 'Technology',
  communication: 'Communication',
  productivity: 'Productivity',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};
