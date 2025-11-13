// constants/Theme.ts

const palette = {
  // --- Core Brand Colors (from track_base.tsx) ---
  brandPink: '#F18C8E',
  brandGreen: '#BFD3C1',
  brandOffWhite: '#F8F1EC',
  actionOrange: '#F8BF80',
  actionPink: '#F3A8BB',
  // --- Action & Accent Colors (from other components) ---
  // Blues
  bluePrimary: '#1E40AF',
  blueAction: '#2563EB',
  blueSecondary: '#007AFF',
  blueDark: '#15223F',
  blueTint: '#0a7ea4',

  // Reds
  redAccent: '#D63A2D',
  redDanger: '#EF4444',
  redDark: '#b91c1c',

  // Greens
  greenSuccess: '#10B981',

  // --- Grayscale (consolidated from all files) ---
  gray900: '#11181C', // Darkest text
  gray800: '#1F2937',
  gray700: '#444444', // Dark text from track_base
  gray600: '#4B5563',
  gray500: '#6B7280',
  gray450: '#888888', // Light text from track_base
  gray400: '#9BA1A6',
  gray300: '#A9A9A9',
  gray200: '#D1D5DB',
  gray150: '#E5E5E5', // Circle bg from track_base
  gray100: '#E5E7EB',
  gray75: '#eeeeee', // Avatar bg from track_base
  gray50: '#F3F4F6',

  // --- Base ---
  white: '#FFFFFF',
  black: '#000000',
};


export const tracking_colors = {
    coralRed: '#EE8A82',    // Action button
    dangerRed: '#D63A2D',   // Base emergency color
    successGreen: '#79CA90', // Progress bar fill / Report button
    
    // Text & Icons
    darkBlue: '#15223F',    // Main text / Map icon
    white: '#FFFFFF',       // Button text
    
    // Background & UI Tints
    componentBg: '#ECECEC4D',  // Main component bg (ECECEC at 70% alpha)
    emergencyBg: '#D63A2DE6', // Emergency button bg (D63A2D at 90% alpha)
    progressBarBg: '#FFF6F0',// Progress bar background
    disabledGrey: '#D9D9D9', // Counting dot / Location share bg
}

export const uiParameters = {
  mainComponent: {
    background: tracking_colors.componentBg, // <-- Uses the 70% alpha color
    blur: '60px',
    text: tracking_colors.darkBlue,
    textSize: '1rem', // Or '1rem', '1.2em', etc.
  },
  progressBar: {
    background: tracking_colors.progressBarBg,
    fill: tracking_colors.successGreen,
  },
  countingDot: {
    background: tracking_colors.disabledGrey,
    active: tracking_colors.dangerRed, // Using the solid red here
  },
  buttons: {
    action: {
      background: tracking_colors.coralRed,
      text: tracking_colors.white,
      effect: 'drop-shadow',
    },
    emergency: {
      background: tracking_colors.emergencyBg, // <-- Uses the 90% alpha color
      blur: '60px',
      text: tracking_colors.white,
    },
    report: {
      background: tracking_colors.successGreen,
      text: tracking_colors.white,
    },
    mapRecenter: {
      // Assuming this background is also transparent
      background: tracking_colors.componentBg, 
      icon: tracking_colors.darkBlue,
    },
    locationShare: {
      default: {
        background: tracking_colors.disabledGrey,
        icon: tracking_colors.white,
      },
      active: {
        background: tracking_colors.coralRed,
        icon: tracking_colors.white,
      },
    },
  },
};


export const colors = {
  ...palette,
  // --- Semantic Aliases ---
  primary: palette.brandPink,
  secondary: palette.brandGreen,
  accent: palette.redAccent,
  background: palette.brandOffWhite,
  
  textPrimary: palette.gray700,
  textSecondary: palette.gray450,
  
  action: palette.bluePrimary,
  success: palette.greenSuccess,
  danger: palette.redDanger,
  
  // --- Light/Dark Mode Support (can be expanded) ---
  light: {
    text: palette.gray900,
    background: palette.white,
    tint: palette.blueTint,
    icon: palette.gray500,
  },
  dark: {
    text: palette.gray100,
    background: palette.gray800,
    tint: palette.white,
    icon: palette.gray400,
  },
};

export const spacing = {
  xs: 4,
  sm: 2,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const typography = {
  fontSizes: {
    h1: 28,
    h2: 24,
    h3: 22,
    h4: 18,
    body: 16,
    caption: 14,
    label: 12,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
};

export const radii = {
  sm: 8,
  md: 10,
  lg: 25,
  xl: 32, // from track_base.tsx container
  xxl: 80,
  full: 999,
};

const Theme = {
  colors,
  spacing,
  typography,
  radii,
};

export default Theme;
