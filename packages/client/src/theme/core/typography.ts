import type {
  CSSObject,
  Breakpoint,
  TypographyVariantsOptions,
} from "@mui/material/styles";

import { pxToRem, setFont } from "minimal-shared/utils";

import { themeConfig } from "../theme-config";

// ----------------------------------------------------------------------

/**
 * TypeScript (type definition and extension)
 * @to {@link file://./../extend-theme-types.d.ts}
 */
export type FontStyleExtend = {
  fontWeightSemiBold: CSSObject["fontWeight"];
  fontSecondaryFamily: CSSObject["fontFamily"];
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

  fontWeightLight: "300",
  fontWeightRegular: "400",
  fontWeightMedium: "500",
  fontWeightSemiBold: "600",
  fontWeightBold: "700",

  // ======================
  // HEADINGS (Poppins Bold)
  // ======================

  h1: {
    fontFamily: primaryFont,
    fontWeight: 700,
    lineHeight: 1.2,
    fontSize: pxToRem(68),
  },
  h2: {
    fontFamily: primaryFont,
    fontWeight: 700,
    lineHeight: 1.2,
    fontSize: pxToRem(56),
  },
  h3: {
    fontFamily: primaryFont,
    fontWeight: 700,
    lineHeight: 1.2,
    fontSize: pxToRem(46),
  },
  h4: {
    fontFamily: primaryFont,
    fontWeight: 700,
    lineHeight: 1.2,
    fontSize: pxToRem(38),
  },
  h5: {
    fontFamily: primaryFont,
    fontWeight: 700,
    lineHeight: 1.2,
    fontSize: pxToRem(32),
  },
  h6: {
    fontFamily: primaryFont,
    fontWeight: 700,
    lineHeight: 1.2,
    fontSize: pxToRem(26),
  },

  // If your system supports custom variant (H7)
  subtitle1: {
    fontFamily: primaryFont,
    fontWeight: 700,
    lineHeight: 1.3,
    fontSize: pxToRem(22),
  },

  // ======================
  // BODY
  // ======================

  body1: {
    fontFamily: primaryFont,
    fontWeight: 500, // Medium
    lineHeight: 1.6,
    fontSize: pxToRem(18),
  },
  body2: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.6,
    fontSize: pxToRem(16),
  },
  caption: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.6,
    fontSize: pxToRem(14),
  },
  overline: {
    fontFamily: primaryFont,
    fontWeight: 400,
    lineHeight: 1.6,
    fontSize: pxToRem(12),
  },

  // Optional smallest body (10px)
  button: {
    fontFamily: primaryFont,
    fontWeight: 500,
    lineHeight: 1.5,
    fontSize: pxToRem(10),
    textTransform: "unset",
  },
};
