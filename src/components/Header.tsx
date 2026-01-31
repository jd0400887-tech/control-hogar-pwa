import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { supabase } from '../supabaseClient';
import LogoutIcon from '@mui/icons-material/Logout';

interface UserProfile {
  id: string;
  first_name: string;
}

const Header: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase.from('profiles').select('id, first_name').eq('id', user.id).single();
          if (error) throw error;
          setUserProfile(data);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Buenos días";
      if (hour < 19) return "Buenas tardes";
      return "Buenas noches";
    };
    setGreeting(getGreeting());
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      p: 2,
      bgcolor: 'background.paper', // Use theme's paper color
      boxShadow: 3,
      borderRadius: 2,
      mb: 3,
    }}>
      <Typography variant="h6" color="primary">
        {greeting}, {userProfile?.first_name || 'Usuario'}
      </Typography>
      <Button
        variant="outlined"
        color="secondary"
        onClick={handleLogout}
        startIcon={<LogoutIcon />}
        size="small"
      >
        Salir
      </Button>
    </Box>
  );
};

export default Header;
