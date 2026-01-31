import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select,
  FormControl, InputLabel, CircularProgress, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Alert, Paper
} from '@mui/material';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// Define type for a savings movement
interface SavingMovement {
  id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  description?: string;
  created_at: string;
}

const Savings: React.FC = () => {
  const [movements, setMovements] = useState<SavingMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newType, setNewType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [newDescription, setNewDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const [showHistory, setShowHistory] = useState(true);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado.");

      const { data, error } = await supabase
        .from('savings_movements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMovements(data || []);
      const total = (data || []).reduce((sum, movement) => {
        return sum + (movement.type === 'deposit' ? movement.amount : -movement.amount);
      }, 0);
      setTotalSavings(total);

    } catch (err: any) {
      console.error('Error fetching savings movements:', err);
      setError('Error al cargar movimientos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovements();

    // Set up Realtime subscription
    const channel = supabase
      .channel('savings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_movements' }, (_payload) => {
        // For simplicity, re-fetch all movements on any change.
        // For larger apps, more granular updates could be implemented.
        fetchMovements();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchMovements]);

  const handleAddMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newAmount === '' || newAmount <= 0) {
      setError('El monto debe ser un número positivo.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado.');

      const { error } = await supabase
        .from('savings_movements')
        .insert({
          user_id: user.id,
          amount: newAmount,
          type: newType,
          description: newDescription,
        });

      if (error) throw error;

      setNewAmount('');
      setNewDescription('');
      // fetchMovements will be called by the Realtime subscription
      // or can be called directly here if Realtime is not active/desired for immediate feedback
    } catch (err: any) {
      console.error('Error adding movement:', err);
      setError('Error al añadir movimiento: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMovement = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
      return;
    }
    setLoading(true); // Re-show loading state during delete
    setError(null);
    try {
      const { error } = await supabase
        .from('savings_movements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      // fetchMovements will be called by the Realtime subscription
    } catch (err: any) {
      console.error('Error deleting movement:', err);
      setError('Error al eliminar movimiento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: '600px', margin: 'auto', padding: '16px' }}
    >
      <Typography variant="h5" component="h1" gutterBottom color="primary" textAlign="center">
        Control de Ahorros
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Typography variant="h6" color="secondary" gutterBottom>
          Ahorro Total: <Box component="span" sx={{ fontWeight: 'bold' }}>COP {totalSavings.toLocaleString('es-CO')}</Box>
        </Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Typography variant="body1" gutterBottom color="text.primary">Añadir Nuevo Movimiento</Typography>
        <Box component="form" onSubmit={handleAddMovement} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Monto (COP)"
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(parseFloat(e.target.value) || '')}
            fullWidth
            required
            variant="outlined"
            inputProps={{ step: "0.01", min: "0" }}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel>Tipo</InputLabel>
            <Select
              value={newType}
              onChange={(e) => setNewType(e.target.value as 'deposit' | 'withdrawal')}
              label="Tipo"
            >
              <MenuItem value="deposit">Depósito</MenuItem>
              <MenuItem value="withdrawal">Retiro</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Descripción (Opcional)"
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            fullWidth
            variant="outlined"
            multiline
            rows={2}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <AddCircleOutlineIcon />}
            sx={{ mt: 1, height: 50 }}
          >
            {submitting ? 'Guardando...' : 'Añadir Movimiento'}
          </Button>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, bgcolor: 'background.paper' }}>
        <Typography variant="body1" gutterBottom color="text.primary" onClick={() => setShowHistory(!showHistory)} sx={{ cursor: 'pointer' }}>
          Historial de Movimientos
        </Typography>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress color="primary" /></Box>}
        {!loading && movements.length === 0 && (
          <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
            No hay movimientos registrados aún.
          </Typography>
        )}
        {showHistory && (
          <List sx={{
            width: '100%',
            maxHeight: '400px', // Limit height for scrollbar
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#333',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#00ff00', // Neon Green
              borderRadius: '10px',
              boxShadow: '0 0 5px #00ff00, 0 0 10px #00ff00, 0 0 15px #00ff00', // Neon glow
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: '#00cc00',
              boxShadow: '0 0 5px #00cc00, 0 0 10px #00cc00, 0 0 15px #00cc00',
            },
          }}>
            {movements.map((movement) => (
              <ListItem
                key={movement.id}
                divider
                sx={{
                  bgcolor: movement.type === 'deposit' ? 'rgba(57, 255, 20, 0.1)' : 'rgba(255, 20, 147, 0.1)',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography component="span" variant="body2" sx={{ fontWeight: 'bold' }}>
                        {movement.type === 'deposit' ? 'Depósito:' : 'Retiro:'}
                      </Typography>
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          color: movement.type === 'deposit' ? 'primary.main' : 'error.main',
                        }}
                      >
                        COP {movement.amount.toLocaleString('es-CO')}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography component="span" variant="caption" color="text.secondary" display="block">
                        {movement.description || 'Sin descripción'}
                      </Typography>
                      <Typography component="span" variant="caption" color="text.disabled" display="block">
                        {new Date(movement.created_at).toLocaleString('es-CO')}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteMovement(movement.id)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </motion.div>
  );
};

export default Savings;