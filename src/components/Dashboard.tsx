import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Grid, Card, CardContent, Alert } from '@mui/material';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ListAltIcon from '@mui/icons-material/ListAlt';

interface SavingMovement {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  description?: string;
  created_at: string;
}

interface GroceryItem {
  id: string;
  user_id: string | null;
  name: string;
  quantity: number;
  unit?: string;
  is_bought: boolean;
  created_at: string;
  updated_at: string;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Savings State
  const [totalSavings, setTotalSavings] = useState(0);
  const [depositCount, setDepositCount] = useState(0);
  const [withdrawalCount, setWithdrawalCount] = useState(0);

  // Grocery List State
  const [totalGroceryItems, setTotalGroceryItems] = useState(0);
  const [boughtGroceryItems, setBoughtGroceryItems] = useState(0);
  const [remainingGroceryItems, setRemainingGroceryItems] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Savings Data
      const { data: savingsData, error: savingsError } = await supabase
        .from('savings_movements')
        .select('*');

      if (savingsError) throw savingsError;

      const currentTotalSavings = (savingsData || []).reduce((sum, movement) => {
        return sum + (movement.type === 'deposit' ? movement.amount : -movement.amount);
      }, 0);
      setTotalSavings(currentTotalSavings);
      setDepositCount((savingsData || []).filter(m => m.type === 'deposit').length);
      setWithdrawalCount((savingsData || []).filter(m => m.type === 'withdrawal').length);

      // Fetch Grocery Data
      const { data: groceryData, error: groceryError } = await supabase
        .from('grocery_items')
        .select('*');

      if (groceryError) throw groceryError;

      setTotalGroceryItems((groceryData || []).length);
      setBoughtGroceryItems((groceryData || []).filter(item => item.is_bought).length);
      setRemainingGroceryItems((groceryData || []).filter(item => !item.is_bought).length);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('Error al cargar datos del Dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Set up Realtime subscriptions for both tables
    const savingsChannel = supabase
      .channel('dashboard-savings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_movements' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const groceryChannel = supabase
      .channel('dashboard-grocery-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      savingsChannel.unsubscribe();
      groceryChannel.unsubscribe();
    };
  }, [fetchDashboardData]);


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: '900px', margin: 'auto', padding: '16px' }}
    >
      <Typography variant="h4" component="h1" gutterBottom color="primary" textAlign="center">
        Panel de Control
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Savings Summary */}
          <Grid item xs={12} md={6} component="div">
            <Card elevation={3} sx={{ bgcolor: 'background.paper' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AccountBalanceWalletIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
                  <Typography variant="h5" color="text.primary">Resumen de Ahorros</Typography>
                </Box>
                <Typography variant="h6" color="secondary" gutterBottom>
                  Total Ahorrado: <Box component="span" sx={{ fontWeight: 'bold' }}>COP {totalSavings.toLocaleString('es-CO')}</Box>
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <ArrowUpwardIcon color="primary" />
                    <Typography variant="body1" color="text.secondary">Depósitos:</Typography>
                    <Typography variant="h6" color="primary">{depositCount}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <ArrowDownwardIcon color="error" />
                    <Typography variant="body1" color="text.secondary">Retiros:</Typography>
                    <Typography variant="h6" color="error">{withdrawalCount}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Grocery List Summary */}
          <Grid item xs={12} md={6} component="div">
            <Card elevation={3} sx={{ bgcolor: 'background.paper' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ShoppingCartIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
                  <Typography variant="h5" color="text.primary">Resumen Lista de Mercado</Typography>
                </Box>
                <Typography variant="h6" color="secondary" gutterBottom>
                  Total Artículos: <Box component="span" sx={{ fontWeight: 'bold' }}>{totalGroceryItems}</Box>
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <CheckCircleOutlineIcon color="success" />
                    <Typography variant="body1" color="text.secondary">Comprados:</Typography>
                    <Typography variant="h6" color="success">{boughtGroceryItems}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <ListAltIcon color="info" />
                    <Typography variant="body1" color="text.secondary">Pendientes:</Typography>
                    <Typography variant="h6" color="info">{remainingGroceryItems}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </motion.div>
  );
};

export default Dashboard;