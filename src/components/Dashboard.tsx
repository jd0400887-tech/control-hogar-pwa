import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Card, CardContent, Alert, Chip } from '@mui/material';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { supabase } from '../supabaseClient';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ListAltIcon from '@mui/icons-material/ListAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckIcon from '@mui/icons-material/Check';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

// Helper to get the ISO week number for a date
const getWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Enhanced Savings State ---
  const [totalSavings, setTotalSavings] = useState(0);

  const [chipData, setChipData] = useState<React.ReactNode[]>([]);
  const [chipIndex, setChipIndex] = useState(0);

              // --- Grocery List State ---

              const [totalGroceryItems, setTotalGroceryItems] = useState(0);

              const [boughtGroceryItems, setBoughtGroceryItems] = useState(0);

        

              // Framer Motion for number animation

              const count = useMotionValue(0);

              const formattedTotal = useTransform(count, latest => `COP ${Math.round(latest).toLocaleString('es-CO')}`);

        

              useEffect(() => {

                const controls = animate(count, totalSavings, {

                  duration: 1.5, // Animation duration in seconds

                  ease: "easeOut",

                });

                return controls.stop;

              }, [count, totalSavings]);

        

              const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // --- Get User IDs for the household ---
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado para cargar el panel.");

      // Create a unique set of user IDs for the household
      const householdUserIds = Array.from(new Set([user.id, '45fc4c0d-f1ed-47bc-9fab-2ccda8e105a7']));

      // --- 1. Fetch Shared Savings Data ---
      const { data: savingsData, error: savingsError } = await supabase
        .from('savings_movements')
        .select('*')
        .in('user_id', householdUserIds) // Fetch for both users
        .order('created_at', { ascending: false });

      if (savingsError) throw savingsError;
      const movements = savingsData || [];

      // --- 2. Calculate Total Savings (based on combined data) ---
      const currentTotalSavings = movements.reduce((sum, movement) => {
        return sum + (movement.type === 'deposit' ? movement.amount : -movement.amount);
      }, 0);
      setTotalSavings(currentTotalSavings);

      // --- 3. Calculate Chip Metrics (based on combined data) ---
      const newChipData = [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const depositsThisMonth = movements
        .filter(m => m.type === 'deposit' && new Date(m.created_at) >= startOfMonth)
        .reduce((sum, m) => sum + m.amount, 0);
      
      const totalAtStartOfMonth = currentTotalSavings - depositsThisMonth;

      if (totalAtStartOfMonth > 0) {
        const growthPercentage = (depositsThisMonth / totalAtStartOfMonth) * 100;
        newChipData.push(
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
              +{growthPercentage.toFixed(1)}% este mes
            </Typography>
          </Box>
        );
      }
      const lastDeposit = movements.find(m => m.type === 'deposit');
      if (lastDeposit) {
        newChipData.push(
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
              Último aporte: +{lastDeposit.amount.toLocaleString('es-CO')}
            </Typography>
          </Box>
        );
      }
      const depositWeeks = new Set(movements
        .filter(m => m.type === 'deposit')
        .map(m => `${new Date(m.created_at).getFullYear()}-${getWeek(new Date(m.created_at))}`)
      );
      let weeklyStreak = 0;
      let currentWeek = getWeek(now);
      let currentYear = now.getFullYear();
      while (depositWeeks.has(`${currentYear}-${currentWeek}`)) {
        weeklyStreak++;
        currentWeek--;
        if (currentWeek === 0) {
          currentWeek = 52;
          currentYear--;
        }
      }
      if (weeklyStreak > 0) {
        newChipData.push(
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocalFireDepartmentIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
              Racha: {weeklyStreak} semana{weeklyStreak > 1 ? 's' : ''}
            </Typography>
          </Box>
        );
      }
      setChipData(newChipData);

      // --- 4. Fetch Shared Grocery Data ---
      const { data: groceryData, error: groceryError } = await supabase
        .from('grocery_items')
        .select('*')
        .in('user_id', householdUserIds); // Fetch for both users

      if (groceryError) throw groceryError;
      setTotalGroceryItems((groceryData || []).length);
      setBoughtGroceryItems((groceryData || []).filter(item => item.is_bought).length);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError('Error al cargar datos del Dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const savingsChannel = supabase.channel('dashboard-savings-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'savings_movements' }, fetchDashboardData).subscribe();
    const groceryChannel = supabase.channel('dashboard-grocery-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items' }, fetchDashboardData).subscribe();
    return () => {
      savingsChannel.unsubscribe();
      groceryChannel.unsubscribe();
    };
  }, [fetchDashboardData]);

  // Effect for rotating chip
  useEffect(() => {
    if (chipData.length > 1) {
      const timer = setInterval(() => {
        setChipIndex((prevIndex) => (prevIndex + 1) % chipData.length);
      }, 6000); // Rotate every 6 seconds
      return () => clearInterval(timer);
    }
  }, [chipData.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: '600px', margin: 'auto', padding: '16px' }}
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
        <>
          {/* Enhanced Savings Summary */}
          <Box sx={{ mb: 3 }}>
            <Card elevation={3} sx={{ bgcolor: 'background.paper' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <AccountBalanceWalletIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                  <Typography variant="h6" color="text.primary">Total Ahorrado</Typography>
                </Box>
                <Typography variant="h3" component="p" sx={{ fontWeight: 'bold', color: 'text.primary', my: 1 }}>
                  <motion.span>{formattedTotal}</motion.span>
                </Typography>
                {chipData.length > 0 && (
                  <Chip
                    label={chipData[chipIndex]}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1, transition: 'all 0.3s ease-in-out' }}
                  />
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Grocery List Summary */}
          <Box>
            <Card elevation={3} sx={{ bgcolor: 'background.paper' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ShoppingCartIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
                  <Typography variant="h5" color="text.primary">Resumen Lista de Mercado</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <ListAltIcon color="info" />
                    <Typography variant="body1" color="text.secondary">Total Artículos:</Typography>
                    <Typography variant="h6" color="info">{totalGroceryItems}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <CheckCircleOutlineIcon color="success" />
                    <Typography variant="body1" color="text.secondary">Comprados:</Typography>
                    <Typography variant="h6" color="success">{boughtGroceryItems}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </>
      )}
    </motion.div>
  );
};

export default Dashboard;
