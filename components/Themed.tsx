/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { Text as DefaultText, View as DefaultView } from 'react-native';

import { colors, colorsDark } from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof colors
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    // Current Colors.ts structure: export const colors = { ... }; export const colorsDark = { ... };
    // We import them as named imports.
    // Fallback to colors (light) if dark mode color is missing
    if (theme === 'dark' && colorsDark && (colorName in colorsDark)) {
      return (colorsDark as any)[colorName];
    }
    return colors[colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  // 'text' key doesn't exist in new Colors structure, use 'textPrimary' as default
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'textPrimary');

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  // 'background' key exists in new Colors structure
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
