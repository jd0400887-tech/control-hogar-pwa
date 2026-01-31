import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Define custom colors for a vivid/neon feel
const neonBlue = '#00FFFF';  // Cyan/Aqua
const neonPurple = '#8A2BE2'; // BlueViolet
const darkBackground = '#0A0A1F'; // Very dark blue/purple

let theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: neonBlue,
      light: '#66FFFF',
      dark: '#00CCCC',
      contrastText: '#000',
    },
    secondary: {
      main: neonPurple,
      light: '#A052E8',
      dark: '#6B23B3',
      contrastText: '#FFF',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: darkBackground,
      paper: '#1A1A2E', // Slightly lighter dark blue
    },
    text: {
      primary: '#E0E0E0',
      secondary: '#B0B0B0',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      color: neonBlue,
      fontWeight: 700,
      fontSize: '3rem',
    },
    h2: {
        color: neonPurple,
        fontWeight: 600,
        fontSize: '2.5rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 600,
          '&:hover': {
            boxShadow: `0 0 8px ${neonBlue}, 0 0 16px ${neonBlue}, 0 0 24px ${neonBlue}`,
            transition: 'box-shadow 0.3s ease-in-out',
            backgroundColor: neonBlue,
            color: darkBackground,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1A1A2E',
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                borderRadius: 12,
                backgroundColor: '#1A1A2E',
                boxShadow: '0px 4px 20px rgba(0, 255, 255, 0.15)', // Subtle neon blue shadow
            },
        },
    },
  },
});

// Make font sizes responsive
theme = responsiveFontSizes(theme);

export default theme;
