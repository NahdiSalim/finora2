import type { CommonColors } from '@mui/material/styles';

import type { ThemeCssVariables } from './types';
import type { PaletteColorNoChannels } from './core/palette';

// ----------------------------------------------------------------------

type ThemeConfig = {
  classesPrefix: string;
  cssVariables: ThemeCssVariables;
  fontFamily: Record<'primary' | 'secondary', string>;
  palette: Record<
    'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error',
    PaletteColorNoChannels
  > & {
    common: Pick<CommonColors, 'black' | 'white'>;
    grey: Record<
      '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '1000',
      string
    >;
  };
};

export const themeConfig: ThemeConfig = {
  /** **************************************
   * Base
   *************************************** */
  classesPrefix: 'minimal',
  /** **************************************
   * Typography
   *************************************** */
  fontFamily: {
    primary: 'Questv1',
    secondary: 'Questv1',
  },
  /** **************************************
   * Palette
   *************************************** */
  palette: {
    primary: {
      lighter: '#d4a4a7',
      light: '#a04853',
      main: '#7a1c23',
      dark: '#5e1a21',
      darker: '#3a1014',
      contrastText: '#FFFFFF',
    },
    secondary: {
      lighter: '#4d4d4d',
      light: '#1a1a1a',
      main: '#090909',
      dark: '#050505',
      darker: '#000000',
      contrastText: '#FFFFFF',
    },
    info: {
      lighter: '#CAFDF5',
      light: '#61F3F3',
      main: '#00B8D9',
      dark: '#006C9C',
      darker: '#003768',
      contrastText: '#FFFFFF',
    },
    success: {
      lighter: '#cbf7db',
      light: '#64e892',
      main: '#1cb953',
      dark: '#169041',
      darker: '#10682e',
      contrastText: '#ffffff',
    },
    warning: {
      lighter: '#ffdbbf',
      light: '#ff9340',
      main: '#ff6f00',
      dark: '#d15b00',
      darker: '#753300',
      contrastText: '#FFFFFF',
    },
    error: {
      lighter: '#fdc0c4',
      light: '#fa414d',
      main: '#f40616',
      dark: '#c80512',
      darker: '#71030a',
      contrastText: '#FFFFFF',
    },
    grey: {
      '100': '#ffffff',
      '200': '#e8e8e8',
      '300': '#d2d2d2',
      '400': '#bbbbbb',
      '500': '#a4a4a4',
      '600': '#8e8e8e',
      '700': '#777777',
      '800': '#606060',
      '900': '#4a4a4a',
      '1000': '#333333',
    },
    common: { black: '#000000', white: '#FFFFFF' },
  },
  /** **************************************
   * Css variables
   *************************************** */
  cssVariables: {
    cssVarPrefix: '',
    colorSchemeSelector: 'data-color-scheme',
  },
};
