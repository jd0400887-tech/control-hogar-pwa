import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Define custom colors for a vivid/neon feel
const neonGreen = '#39FF14'; // Bright green
const neonPink = '#FF1493';  // Bright pink
const neonBlue = '#00FFFF';  // Cyan/Aqua
const darkBackground = '#121212'; // Dark background for contrast

let theme = createTheme({
  palette: {
    mode: 'dark', // Start with a dark mode for better neon contrast
    primary: {
      main: neonGreen,
      light: '#66FF4D', // Lighter shade for hover/active states
      dark: '#00B300',  // Darker shade
      contrastText: '#000', // Black text for vivid colors
    },
    secondary: {
      main: neonPink,
      light: '#FF66B2',
      dark: '#CC0077',
      contrastText: '#FFF',
    },
    info: { // Using info for a neon blue accent
        main: neonBlue,
        light: '#66FFFF',
        dark: '#00CCCC',
        contrastText: '#000',
    },
    error: {
      main: '#f44336', // Standard error color
    },
    background: {
      default: darkBackground,
      paper: '#1E1E1E', // Slightly lighter dark for cards/surfaces
    },
    text: {
      primary: '#E0E0E0', // Light gray for primary text
      secondary: '#B0B0B0', // Medium gray for secondary text
    },
  },
  typography: {
    fontFamily: [
      'Roboto', // Default Material UI font
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      color: neonBlue, // Example of applying neon color to a heading
      fontWeight: 700,
      fontSize: '3rem',
    },
    h2: {
        color: neonGreen,
        fontWeight: 600,
        fontSize: '2.5rem',
    },
    // Add more typography customizations as needed
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Slightly rounded buttons
          padding: '10px 20px',
          fontWeight: 600,
          '&:hover': {
            boxShadow: `0 0 8px ${neonGreen}, 0 0 16px ${neonGreen}, 0 0 24px ${neonGreen}`,
            transition: 'box-shadow 0.3s ease-in-out',
            backgroundColor: neonGreen, // Maintain primary color on hover
            color: darkBackground, // Change text to dark for contrast
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E1E1E', // Darker app bar
          boxShadow: 'none', // No shadow for a flatter look
        },
      },
    },
    MuiPaper: { // For Cards and other Paper-based components
        styleOverrides: {
            root: {
                borderRadius: 12,
                backgroundColor: '#282828', // Darker paper for depth
                boxShadow: '0px 4px 20px rgba(0, 255, 20, 0.2)', // Subtle neon shadow
            },
        },
    },
    // Add more component customizations as needed for neon effects
  },
});

// Make font sizes responsive
theme = responsiveFontSizes(theme);

export default theme;
