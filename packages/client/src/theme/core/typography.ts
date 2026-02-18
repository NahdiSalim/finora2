import type { CSSObject, Breakpoint, TypographyVariantsOptions } from '@mui/material/styles';

import { pxToRem, setFont } from 'minimal-shared/utils';

import { themeConfig } from '../theme-config';

// ----------------------------------------------------------------------

/**
 * TypeScript (type definition and extension)
 * @to {@link file://./../extend-theme-types.d.ts}
 */
export type FontStyleExtend = {
  fontWeightSemiBold: CSSObject['fontWeight'];
  fontSecondaryFamily: CSSObject['fontFamily'];
};

export type ResponsiveFontSizesInput = Partial<Record<Breakpoint, number>>;
export type ResponsiveFontSizesResult = Record<string, { fontSize: string }>;

// function responsiveFontSizes(obj: ResponsiveFontSizesInput): ResponsiveFontSizesResult {
//   const breakpoints: Breakpoint[] = defaultMuiTheme.breakpoints.keys;

//   return breakpoints.reduce((acc, breakpoint) => {
//     const value = obj[breakpoint];

//     if (value !== undefined && value >= 0) {
//       acc[defaultMuiTheme.breakpoints.up(breakpoint)] = {
//         fontSize: pxToRem(value),
//       };
//     }

//     return acc;
//   }, {} as ResponsiveFontSizesResult);
// }

// ----------------------------------------------------------------------

const primaryFont = setFont(themeConfig.fontFamily.primary);
const secondaryFont = setFont(themeConfig.fontFamily.secondary);

export const typography: TypographyVariantsOptions = {
  fontFamily: primaryFont,
  fontSecondaryFamily: secondaryFont,
  fontWeightLight: '300',
  fontWeightRegular: '400',
  fontWeightMedium: '500',
  fontWeightSemiBold: '600',
  fontWeightBold: '700',
  h1: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.2,
    fontSize: pxToRem(68),
  },
  h2: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.2,
    fontSize: pxToRem(56),
  },
  h3: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.2,
    fontSize: pxToRem(44),
  },
  h4: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.2,
    fontSize: pxToRem(38),
  },
  h5: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.2,
    fontSize: pxToRem(32),
  },
  h6: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.2,
    fontSize: pxToRem(26),
  },
  subtitle1: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.5,
    fontSize: pxToRem(22),
  },
  subtitle2: {
    fontFamily: primaryFont,
    fontWeight: 500,
    lineHeight: 1.5,
    fontSize: pxToRem(26),
  },
  body1: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.5,
    fontSize: pxToRem(18),
  },
  body2: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.5,
    fontSize: pxToRem(16),
  },
  caption: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.5,
    fontSize: pxToRem(14),
  },
  overline: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.5,
    fontSize: pxToRem(12),
  },
  button: {
    fontFamily: primaryFont,
    fontWeight: 500,
    lineHeight: 1.5,
    fontSize: pxToRem(14),
    textTransform: 'unset',
  },
};
