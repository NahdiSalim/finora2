import type { CommonColors } from "@mui/material/styles";

import type { ThemeCssVariables } from "./types";
import type { PaletteColorNoChannels } from "./core/palette";

// ----------------------------------------------------------------------

type ThemeConfig = {
  classesPrefix: string;
  cssVariables: ThemeCssVariables;
  fontFamily: Record<"primary" | "secondary", string>;
  palette: Record<
    "primary" | "secondary" | "info" | "success" | "warning" | "error",
    PaletteColorNoChannels
  > & {
    common: Pick<CommonColors, "black" | "white">;
    grey: Record<
      | "100"
      | "200"
      | "300"
      | "400"
      | "500"
      | "600"
      | "700"
      | "800"
      | "900"
      | "1000",
      string
    >;
  };
};

export const themeConfig: ThemeConfig = {
  /** **************************************
   * Base
   *************************************** */
  classesPrefix: "fluid",
  /** **************************************
   * Typography
   *************************************** */
  fontFamily: {
    primary: "Poppins",
    secondary: "Poppins",
  },
  /** **************************************
   * Palette
   *************************************** */
  palette: {
    primary: {
      lighter: "#e8effd",
      light: "#e8effd",
      main: "#1d61e7",
      dark: "#1649ad",
      darker: "#0a2251",
      contrastText: "#FFFFFF",
    },
    secondary: {
      lighter: "#fff2e7",
      light: "#fff2e7",
      main: "#ff7d0d",
      dark: "#bf5e0a",
      darker: "#592c05",
      contrastText: "#FFFFFF",
    },
    info: {
      lighter: "#b2bbc6",
      light: "#a3adbb",
      main: "#546881",
      dark: "#1d242d",
      darker: "#1d242d",
      contrastText: "#FFFFFF",
    },
    success: {
      lighter: "#eefff7",
      light: "#cbffe7",
      main: "#57ffb0",
      dark: "#41bf84",
      darker: "#1e593e",
      contrastText: "#ffffff",
    },
    warning: {
      lighter: "#fff2e7",
      light: "#fff2e7",
      main: "#ff7d0d",
      dark: "#bf5e0a",
      darker: "#592c05",
      contrastText: "#FFFFFF",
    },
    error: {
      lighter: "#ffeeee",
      light: "#ffeeee",
      main: "#ff5757",
      dark: "#bf4141",
      darker: "#591e1e",
      contrastText: "#FFFFFF",
    },
    grey: {
      "100": "#ffffff",
      "200": "#e8e8e8",
      "300": "#d2d2d2",
      "400": "#bbbbbb",
      "500": "#a4a4a4",
      "600": "#8e8e8e",
      "700": "#777777",
      "800": "#606060",
      "900": "#4a4a4a",
      "1000": "#333333",
    },
    common: { black: "#000000", white: "#FFFFFF" },
  },
  /** **************************************
   * Css variables
   *************************************** */
  cssVariables: {
    cssVarPrefix: "",
    colorSchemeSelector: "data-color-scheme",
  },
};
