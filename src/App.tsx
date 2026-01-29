import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { motion } from 'framer-motion';
import { BrowserRouter, Routes, Route, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Auth from './components/Auth';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

// Import placeholder components
import Dashboard from './components/Dashboard';
import Savings from './components/Savings';
import GroceryList from './components/GroceryList';

// Icons for navigation
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ListAltIcon from '@mui/icons-material/ListAlt';

const AuthenticatedApp: React.FC<{ session: Session }> = (props) => {
  // Use props.session explicitly to avoid TS6133 warning for 'session'
  const session = props.session; 
  const location = useLocation();
  const navigate = useNavigate();
  const [value, setValue] = useState(location.pathname);

  useEffect(() => {
    setValue(location.pathname);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      bgcolor: 'background.default',
    }}>
      <Box sx={{ flexGrow: 1, p: 3 }}> {/* Main content area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/grocery-list" element={<GroceryList />} />
            <Route path="*" element={<Typography variant="h4" color="error" textAlign="center">404 - Página no encontrada</Typography>} />
          </Routes>
        </motion.div>
      </Box>

      {/* Logout button fixed to top right */}
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleLogout}
          endIcon={<LogoutIcon />}
        >
          Salir
        </Button>
      </Box>


      <BottomNavigation
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue);
          navigate(newValue);
        }}
        sx={{
          width: '100%',
          position: 'fixed',
          bottom: 0,
          left: 0,
          bgcolor: 'background.paper',
          boxShadow: 3,
          py: 1, // Padding vertical
        }}
      >
        <BottomNavigationAction
          label="Dashboard"
          value="/dashboard"
          icon={<DashboardIcon />}
          component={RouterLink}
          to="/dashboard"
        />
        <BottomNavigationAction
          label="Ahorros"
          value="/savings"
          icon={<AccountBalanceWalletIcon />}
          component={RouterLink}
          to="/savings"
        />
        <BottomNavigationAction
          label="Lista"
          value="/grocery-list"
          icon={<ShoppingCartIcon />}
          component={RouterLink}
          to="/grocery-list"
        />
      </BottomNavigation>
    </Box>
  );
};


function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    fetchSession();

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (event, session) => { // Removed underscore from event
        void event; // Explicitly mark event as consumed
        setSession(session);
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'background.default',
      }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <BrowserRouter>
      {session ? <AuthenticatedApp session={session} /> : <Auth />}
    </BrowserRouter>
  );
}

export default App;
