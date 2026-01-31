import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Card, CardContent, Alert, Chip, IconButton, List, ListItem, ListItemText, Divider } from '@mui/material';
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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'; // New Import
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'; // New Import
import Header from './Header';

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
  const [netPreviousMonth, setNetPreviousMonth] = useState(0); // New state for previous month's net savings
  const [monthlyChange, setMonthlyChange] = useState(0); // New state for monthly change
  const [largestDeposit, setLargestDeposit] = useState(0);
  const [shoppingProgress, setShoppingProgress] = useState(0);
  const [boughtItemsCount, setBoughtItemsCount] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [suggestedItems, setSuggestedItems] = useState<string[]>([]);
  const [davidTotalSavings, setDavidTotalSavings] = useState(0);
  const [andreaTotalSavings, setAndreaTotalSavings] = useState(0);
  
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
      
      // Define the static list of both household user IDs to ensure symmetrical data fetching.
      // The user must replace the placeholder with their actual main user ID.
      const householdUserIds = [
        'c1ff78a6-4740-4734-b6d8-024cd85008f0', 
        '45fc4c0d-f1ed-47bc-9fab-2ccda8e105a7'
      ];

      // --- Fetch Data ---
      const { data: savingsData, error: savingsError } = await supabase.from('savings_movements').select('created_at, type, amount, user_id').in('user_id', householdUserIds).order('created_at', { ascending: false });
      if (savingsError) throw savingsError;
      const movements = savingsData || [];

      // Fetch all grocery items, including archived ones, for suggestion logic
      const { data: allGroceryItems, error: groceryError } = await supabase.from('grocery_items').select('name, is_bought, is_archived, created_at, bought_at').in('user_id', householdUserIds);
      if (groceryError) throw groceryError;
      
      // Active items are those not archived - for progress stats
      const activeGroceryItems = allGroceryItems.filter(item => !item.is_archived);

      // --- Calculations ---
      const now = new Date();
      // Savings
      const currentTotalSavings = movements.reduce((sum, m) => sum + (m.type === 'deposit' ? m.amount : -m.amount), 0);
      setTotalSavings(currentTotalSavings);

      // Individual Savings
      const davidId = 'c1ff78a6-4740-4734-b6d8-024cd85008f0';
      const andreaId = '45fc4c0d-f1ed-47bc-9fab-2ccda8e105a7';

      const davidTotal = movements
        .filter(m => m.user_id === davidId)
        .reduce((sum, m) => sum + (m.type === 'deposit' ? m.amount : -m.amount), 0);
      setDavidTotalSavings(davidTotal);

      const andreaTotal = movements
        .filter(m => m.user_id === andreaId)
        .reduce((sum, m) => sum + (m.type === 'deposit' ? m.amount : -m.amount), 0);
      setAndreaTotalSavings(andreaTotal);
      
      // Key Stats
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyMovements = movements.filter(m => new Date(m.created_at) >= startOfMonth);
      const netMonth = monthlyMovements.reduce((sum, m) => sum + (m.type === 'deposit' ? m.amount : -m.amount), 0);
      setNetMonthlySavings(netMonth);

      // Calculate Net Savings for Previous Month
      const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      const previousMonthMovements = movements.filter(m => {
          const movementDate = new Date(m.created_at);
          return movementDate >= startOfPreviousMonth && movementDate <= endOfPreviousMonth;
      });
      const netPreviousMonthCalc = previousMonthMovements.reduce((sum, m) => sum + (m.type === 'deposit' ? m.amount : -m.amount), 0);
      setNetPreviousMonth(netPreviousMonthCalc);

      // Calculate Monthly Change
      const monthlyChangeCalc = netMonth - netPreviousMonthCalc;
      setMonthlyChange(monthlyChangeCalc);

      const savingsByMonth = movements.reduce((acc, m) => {
        const monthKey = `${new Date(m.created_at).getFullYear()}-${new Date(m.created_at).getMonth()}`;
        if (!acc[monthKey]) acc[monthKey] = 0;
        acc[monthKey] += (m.type === 'deposit' ? m.amount : -m.amount);
        return acc;
      }, {} as { [key: string]: number });
      const monthlyTotals = Object.values(savingsByMonth);
      const avgMonth = monthlyTotals.length > 0 ? monthlyTotals.reduce((sum, v) => sum + v, 0) / monthlyTotals.length : 0;
      setAvgMonthlySavings(avgMonth);

      // Re-introduce largest deposit calculation
      const largestDep = movements.filter(m => m.type === 'deposit').reduce((max, m) => m.amount > max ? m.amount : max, 0);
      // Calculate largest withdrawal
      const largestWdl = movements.filter(m => m.type === 'withdrawal').reduce((max, m) => m.amount > max ? m.amount : max, 0);

      // Populate chipData
      const newChipData: React.ReactNode[] = [];
      if (largestDep > 0) newChipData.push(`Mayor Depósito: COP ${largestDep.toLocaleString('es-CO')}`);
      if (largestWdl > 0) newChipData.push(`Mayor Retiro: COP ${largestWdl.toLocaleString('es-CO')}`);
      if (netPreviousMonthCalc !== 0) newChipData.push(`Ahorro Neto Mes Pasado: COP ${netPreviousMonthCalc.toLocaleString('es-CO')}`);
      setChipData(newChipData);
      
      // Grocery Card - Progress (using only ACTIVE items)
      const boughtItems = activeGroceryItems.filter(item => item.is_bought).length;
      const totalItems = activeGroceryItems.length;
      setBoughtItemsCount(boughtItems);
      setTotalItemsCount(totalItems);
      setShoppingProgress(totalItems > 0 ? (boughtItems / totalItems) * 100 : 0);

      // Smart Suggestions (uses ALL items for history, but filters against ACTIVE pending items)
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
      
      // Pending items must be from the active list
      const pendingItemNames = new Set(activeGroceryItems.filter(item => !item.is_bought).map(item => item.name.toLowerCase()));

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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%' }}>
      <Header />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress color="primary" /></Box> : (
        <>
          {/* Savings Summary */}
          <Box sx={{ mb: 3 }}>
            <Card elevation={6} sx={{ bgcolor: 'background.paper', boxShadow: '0px 0px 15px rgba(0, 255, 255, 0.5)' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}><AccountBalanceWalletIcon color="primary" sx={{ mr: 1, fontSize: 28 }} /><Typography variant="body1" color="text.primary">Total Ahorrado</Typography></Box>
                <Typography variant="h3" component="p" sx={{ fontWeight: 'bold', color: 'primary.main', my: 1 }}><motion.span>{formattedTotal}</motion.span></Typography>
                {chipData.length > 0 && (<Chip label={chipData[chipIndex]} variant="outlined" size="small" sx={{ mt: 1, transition: 'all 0.3s ease-in-out' }}/>)}
              </CardContent>
            </Card>
          </Box>

          {/* Key Stats Card */}
          <Box sx={{ mb: 3 }}>
            <Card elevation={3} sx={{ bgcolor: 'background.paper' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}><ShowChartIcon color="primary" sx={{ mr: 1, fontSize: 30 }} /><Typography variant="h6" color="text.primary">Estadísticas Clave</Typography></Box>
                    <Box sx={{ display: 'flex', mt: 2 }}>
                        {/* Left Column */}
                        <Box sx={{ flex: 1, pr: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}><SavingsIcon sx={{ mr: 1.5, color: 'text.secondary' }} /><Box><Typography variant="body2" color="text.secondary">Ahorro Neto este Mes:</Typography><Typography variant="body1" sx={{ fontWeight: 'bold', color: netMonthlySavings >= 0 ? 'success.main' : 'error.main' }}>COP {netMonthlySavings.toLocaleString('es-CO')}</Typography></Box></Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}><TrendingUpIcon sx={{ mr: 1.5, color: 'text.secondary' }} /><Box><Typography variant="body2" color="text.secondary">Ahorro Promedio Mensual:</Typography><Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>COP {Math.round(avgMonthlySavings).toLocaleString('es-CO')}</Typography></Box></Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {monthlyChange >= 0 ? 
                                    <ArrowUpwardIcon sx={{ mr: 1.5, color: 'success.main' }} /> : 
                                    <ArrowDownwardIcon sx={{ mr: 1.5, color: 'error.main' }} />
                                }
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Var. vs Mes Anterior:</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: monthlyChange >= 0 ? 'success.main' : 'error.main' }}>
                                        COP {monthlyChange.toLocaleString('es-CO')}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                        {/* Right Column */}
                        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
                        <Box sx={{ flex: 1, pl: 1 }}>
                            <Typography variant="body1" color="text.primary" gutterBottom>Ahorro Individual</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}><Typography variant="body2" color="text.secondary" sx={{ width: '80px' }}>David:</Typography><Typography variant="body1" sx={{ fontWeight: 'bold', color: 'info.main' }}>COP {davidTotalSavings.toLocaleString('es-CO')}</Typography></Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}><Typography variant="body2" color="text.secondary" sx={{ width: '80px' }}>Andrea:</Typography><Typography variant="body1" sx={{ fontWeight: 'bold', color: 'info.main' }}>COP {andreaTotalSavings.toLocaleString('es-CO')}</Typography></Box>
                        </Box>
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
                  <Typography variant="h6" color="text.primary">Resumen de Mercado</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  {/* Left Side: Progress */}
                  <Box sx={{ width: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress variant="determinate" value={100} sx={{ color: (theme) => theme.palette.grey[200] }} size={80} thickness={4} />
                      <CircularProgress variant="determinate" value={shoppingProgress} sx={{ position: 'absolute', left: 0, color: 'primary.main' }} size={80} thickness={4} />
                      <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="body1" component="div" color="text.secondary">{`${Math.round(shoppingProgress)}%`}</Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>{`${boughtItemsCount} / ${totalItemsCount} comprados`}</Typography>
                  </Box>
                  {/* Right Side: Suggestions */}
                  <Box sx={{ width: '60%', pl: 2 }}>
                    <Box sx={{display: 'flex', alignItems: 'center', mb: 1}}>
                      <LightbulbIcon sx={{ color: 'warning.main', mr: 0.5, fontSize: 18 }}/>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Quizás necesites...</Typography>
                    </Box>
                    {suggestedItems.length > 0 ? (
                      <List dense disablePadding>
                        {suggestedItems.map(item => (
                          <ListItem key={item} disableGutters secondaryAction={<IconButton size="small" onClick={() => handleQuickAddItem(item)}><AddIcon /></IconButton>}>
                            <ListItemText primary={<Typography component="span" variant="body2">{item}</Typography>} secondary={<Typography component="span" variant="caption" color="text.secondary">Añadir</Typography>} />
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