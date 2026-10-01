/**
 * MD3 主题：基于 react-native-paper 的 MD3LightTheme / MD3DarkTheme，
 * 用 QQ 蓝做主色重新调了色板，中性色偏蓝灰，避免 MD3 默认的紫色调。
 *
 * 在 MD3 角色之外额外补了一组「连接状态」色板（online / pending / offline），
 * 因为 MD3 的 primary / secondary / error 语义和连接状态对不上，
 * 硬套会让「在线=蓝色」这种反直觉的配色出现。
 */
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

/** 主题 = MD3 主题 + 状态色扩展 */
export type AppTheme = MD3Theme & {
  colors: MD3Theme['colors'] & {
    /** 已连接 */
    online: string;
    onlineContainer: string;
    onOnlineContainer: string;
    /** 连接中 / 重连中 / 鉴权中 */
    pending: string;
    pendingContainer: string;
    onPendingContainer: string;
    /** 未连接 */
    offline: string;
    offlineContainer: string;
    onOfflineContainer: string;
  };
};

export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0B5FCC',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D8E2FF',
    onPrimaryContainer: '#001A41',
    secondary: '#565E71',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#DAE2F9',
    onSecondaryContainer: '#131C2B',
    tertiary: '#00696B',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#9CF1F3',
    onTertiaryContainer: '#002021',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',
    background: '#F8F9FF',
    onBackground: '#1A1B21',
    surface: '#F8F9FF',
    onSurface: '#1A1B21',
    surfaceVariant: '#E1E2EC',
    onSurfaceVariant: '#44474F',
    surfaceDisabled: 'rgba(26, 27, 33, 0.12)',
    onSurfaceDisabled: 'rgba(26, 27, 33, 0.38)',
    outline: '#74777F',
    outlineVariant: '#C4C6D0',
    inverseSurface: '#2F3036',
    inverseOnSurface: '#F1F0F7',
    inversePrimary: '#ADC6FF',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(41, 43, 50, 0.4)',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: '#F2F3FC',
      level2: '#ECEEF8',
      level3: '#E6E8F3',
    },
    online: '#146C2E',
    onlineContainer: '#C4EFCF',
    onOnlineContainer: '#00210A',
    pending: '#7A5900',
    pendingContainer: '#FFDEA6',
    onPendingContainer: '#261A00',
    offline: '#5F5E62',
    offlineContainer: '#E5E1E6',
    onOfflineContainer: '#1B1B1F',
  },
};

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#ADC6FF',
    onPrimary: '#002E69',
    primaryContainer: '#00458F',
    onPrimaryContainer: '#D8E2FF',
    secondary: '#BEC6DC',
    onSecondary: '#283041',
    secondaryContainer: '#3E4759',
    onSecondaryContainer: '#DAE2F9',
    tertiary: '#80D4D6',
    onTertiary: '#003739',
    tertiaryContainer: '#004F52',
    onTertiaryContainer: '#9CF1F3',
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',
    background: '#111318',
    onBackground: '#E3E2E9',
    surface: '#111318',
    onSurface: '#E3E2E9',
    surfaceVariant: '#44474F',
    onSurfaceVariant: '#C4C6D0',
    surfaceDisabled: 'rgba(227, 226, 233, 0.12)',
    onSurfaceDisabled: 'rgba(227, 226, 233, 0.38)',
    outline: '#8E9099',
    outlineVariant: '#44474F',
    inverseSurface: '#E3E2E9',
    inverseOnSurface: '#2F3036',
    inversePrimary: '#0B5FCC',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(45, 47, 54, 0.4)',
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: '#191C22',
      level2: '#1D2028',
      level3: '#22252D',
    },
    online: '#7DDA95',
    onlineContainer: '#0B5327',
    onOnlineContainer: '#C4EFCF',
    pending: '#F0C048',
    pendingContainer: '#5C4200',
    onPendingContainer: '#FFDEA6',
    offline: '#C8C5CA',
    offlineContainer: '#313036',
    onOfflineContainer: '#E5E1E6',
  },
};

/** 跟随系统的当前主题 */
export function useAppTheme(): AppTheme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

/** 间距刻度：MD3 常用 4 的倍数 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;