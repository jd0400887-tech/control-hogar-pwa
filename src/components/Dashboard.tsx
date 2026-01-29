import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Card, CardContent, Alert, Chip, IconButton, List, ListItem, ListItemText } from '@mui/material';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { supabase } from '../supabaseClient';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckIcon from '@mui/icons-material/Check';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SavingsIcon from '@mui/icons-material/Savings';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AddIcon from '@mui/icons-material/Add';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

// --- (Helper Functions) ---
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

  // --- State ---
  const [totalSavings, setTotalSavings] = useState(0);
  const [chipData, setChipData] = useState<React.ReactNode[]>([]);
  const [chipIndex, setChipIndex] = useState(0);
  const [netMonthlySavings, setNetMonthlySavings] = useState(0);
  const [avgMonthlySavings, setAvgMonthlySavings] = useState(0);
  const [largestDeposit, setLargestDeposit] = useState(0);
  const [shoppingProgress, setShoppingProgress] = useState(0);
  const [boughtItemsCount, setBoughtItemsCount] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [suggestedItems, setSuggestedItems] = useState<string[]>([]);
  
  // --- Framer Motion ---
  const count = useMotionValue(0);
  const formattedTotal = useTransform(count, latest => `COP ${Math.round(latest).toLocaleString('es-CO')}`);
  useEffect(() => {
    const controls = animate(count, totalSavings, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [count, totalSavings]);
  
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado.");
      const householdUserIds = Array.from(new Set([user.id, '45fc4c0d-f1ed-47bc-9fab-2ccda8e105a7']));

      // --- Fetch Data ---
      const { data: savingsData, error: savingsError } = await supabase.from('savings_movements').select('created_at, type, amount').in('user_id', householdUserIds).order('created_at', { ascending: false });
      if (savingsError) throw savingsError;
      const movements = savingsData || [];

      // Fetch grocery items including the new bought_at column
      const { data: groceryData, error: groceryError } = await supabase.from('grocery_items').select('name, is_bought, created_at, bought_at').in('user_id', householdUserIds);
      if (groceryError) throw groceryError;
      const allGroceryItems = groceryData || [];

      // --- Calculations ---
      const now = new Date();
      // Savings
      const currentTotalSavings = movements.reduce((sum, m) => sum + (m.type === 'deposit' ? m.amount : -m.amount), 0);
      setTotalSavings(currentTotalSavings);

      // Key Stats
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyMovements = movements.filter(m => new Date(m.created_at) >= startOfMonth);
      const netMonth = monthlyMovements.reduce((sum, m) => sum + (m.type === 'deposit' ? m.amount : -m.amount), 0);
      setNetMonthlySavings(netMonth);
      const largestDep = movements.filter(m => m.type === 'deposit').reduce((max, m) => m.amount > max ? m.amount : max, 0);
      setLargestDeposit(largestDep);
      const savingsByMonth = movements.reduce((acc, m) => {
        const monthKey = `${new Date(m.created_at).getFullYear()}-${new Date(m.created_at).getMonth()}`;
        if (!acc[monthKey]) acc[monthKey] = 0;
        acc[monthKey] += (m.type === 'deposit' ? m.amount : -m.amount);
        return acc;
      }, {} as { [key: string]: number });
      const monthlyTotals = Object.values(savingsByMonth);
      const avgMonth = monthlyTotals.length > 0 ? monthlyTotals.reduce((sum, v) => sum + v, 0) / monthlyTotals.length : 0;
      setAvgMonthlySavings(avgMonth);

      // Chip Metrics for Savings Card (logic can be added back here if needed)
      // setChipData(...)
      
      // Grocery Card - Progress
      const boughtItems = allGroceryItems.filter(item => item.is_bought).length;
      const totalItems = allGroceryItems.length;
      setBoughtItemsCount(boughtItems);
      setTotalItemsCount(totalItems);
      setShoppingProgress(totalItems > 0 ? (boughtItems / totalItems) * 100 : 0);

      // Smart Suggestions (New Weekly Cycle Logic)
      const today = new Date();
      const dayOfWeek = today.getDay(); // Sunday = 0, Saturday = 6
      const lastSunday = new Date(today);
      lastSunday.setDate(today.getDate() - dayOfWeek - 7);
      lastSunday.setHours(0, 0, 0, 0);

      const lastSaturday = new Date(lastSunday);
      lastSaturday.setDate(lastSunday.getDate() + 6);
      lastSaturday.setHours(23, 59, 59, 999);

      const boughtLastWeekItems = allGroceryItems.filter(item => {
          if (!item.is_bought || !item.bought_at) return false;
          const boughtDate = new Date(item.bought_at);
          return boughtDate >= lastSunday && boughtDate <= lastSaturday;
      });

      const uniqueLastWeekNames = new Set(boughtLastWeekItems.map(item => item.name.toLowerCase()));
      const pendingItemNames = new Set(allGroceryItems.filter(item => !item.is_bought).map(item => item.name.toLowerCase()));

      const suggestions = [];
      for (const name of uniqueLastWeekNames) {
          if (!pendingItemNames.has(name)) {
              suggestions.push(name.charAt(0).toUpperCase() + name.slice(1));
          }
      }
      setSuggestedItems(suggestions.slice(0, 3));

    } catch (err: any) {
      setError('Error al cargar datos del Dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQuickAddItem = async (itemName: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('grocery_items').insert({ name: itemName, user_id: user?.id, quantity: 1 });
        // Realtime will trigger a re-fetch
    } catch (error) {
        console.error("Error quick-adding item:", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const channel = supabase.channel('dashboard-realtime-changes').on('postgres_changes', { event: '*', schema: 'public' }, fetchDashboardData).subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchDashboardData]);

  useEffect(() => {
    if (chipData.length > 1) {
      const timer = setInterval(() => setChipIndex(prev => (prev + 1) % chipData.length), 6000);
      return () => clearInterval(timer);
    }
  }, [chipData.length]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ maxWidth: '600px', margin: 'auto', padding: '16px' }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary" textAlign="center">Panel de Control</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress color="primary" /></Box> : (
        <>
          {/* Savings Summary */}
          <Box sx={{ mb: 3 }}>
            <Card elevation={3} sx={{ bgcolor: 'background.paper' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}><AccountBalanceWalletIcon color="primary" sx={{ mr: 1, fontSize: 28 }} /><Typography variant="h6" color="text.primary">Total Ahorrado</Typography></Box>
                <Typography variant="h3" component="p" sx={{ fontWeight: 'bold', color: 'text.primary', my: 1 }}><motion.span>{formattedTotal}</motion.span></Typography>
                {chipData.length > 0 && (<Chip label={chipData[chipIndex]} variant="outlined" size="small" sx={{ mt: 1, transition: 'all 0.3s ease-in-out' }}/>)}
              </CardContent>
            </Card>
          </Box>

          {/* Key Stats Card */}
          <Box sx={{ mb: 3 }}>
            <Card elevation={3} sx={{ bgcolor: 'background.paper' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}><ShowChartIcon color="primary" sx={{ mr: 1, fontSize: 30 }} /><Typography variant="h5" color="text.primary">Estadísticas Clave</Typography></Box>
                    <Box sx={{ textAlign: 'left', mt: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}><SavingsIcon sx={{ mr: 1.5, color: 'text.secondary' }} /><Box><Typography variant="body1" color="text.secondary">Ahorro Neto este Mes:</Typography><Typography variant="h6" sx={{ fontWeight: 'bold', color: netMonthlySavings >= 0 ? 'success.main' : 'error.main' }}>COP {netMonthlySavings.toLocaleString('es-CO')}</Typography></Box></Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}><TrendingUpIcon sx={{ mr: 1.5, color: 'text.secondary' }} /><Box><Typography variant="body1" color="text.secondary">Ahorro Promedio Mensual:</Typography><Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>COP {Math.round(avgMonthlySavings).toLocaleString('es-CO')}</Typography></Box></Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}><EmojiEventsIcon sx={{ mr: 1.5, color: 'text.secondary' }} /><Box><Typography variant="body1" color="text.secondary">Depósito Más Grande:</Typography><Typography variant="h6" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>COP {largestDeposit.toLocaleString('es-CO')}</Typography></Box></Box>
                    </Box>
                </CardContent>
            </Card>
          </Box>

          {/* Smart Grocery Card */}
          <Box>
            <Card elevation={3} sx={{ bgcolor: 'background.paper' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ShoppingCartIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
                  <Typography variant="h5" color="text.primary">Resumen de Mercado</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  {/* Left Side: Progress */}
                  <Box sx={{ width: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress variant="determinate" value={100} sx={{ color: (theme) => theme.palette.grey[200] }} size={80} thickness={4} />
                      <CircularProgress variant="determinate" value={shoppingProgress} sx={{ position: 'absolute', left: 0, color: 'primary.main' }} size={80} thickness={4} />
                      <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h6" component="div" color="text.secondary">{`${Math.round(shoppingProgress)}%`}</Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{`${boughtItemsCount} / ${totalItemsCount} comprados`}</Typography>
                  </Box>
                  {/* Right Side: Suggestions */}
                  <Box sx={{ width: '60%', pl: 2 }}>
                    <Box sx={{display: 'flex', alignItems: 'center', mb: 1}}>
                      <LightbulbIcon sx={{ color: 'warning.main', mr: 0.5, fontSize: 18 }}/>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Quizás necesites...</Typography>
                    </Box>
                    {suggestedItems.length > 0 ? (
                      <List dense disablePadding>
                        {suggestedItems.map(item => (
                          <ListItem key={item} disableGutters secondaryAction={<IconButton size="small" onClick={() => handleQuickAddItem(item)}><AddIcon /></IconButton>}>
                            <ListItemText primary={item} />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="caption" color="text.secondary">¡Nada por ahora!</Typography>
                    )}
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