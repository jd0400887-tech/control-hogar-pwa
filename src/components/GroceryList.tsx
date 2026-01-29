import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, CircularProgress, List, ListItem, ListItemText,
  ListItemSecondaryAction, IconButton, Checkbox, FormControlLabel, Alert, Paper
} from '@mui/material';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// Define type for a grocery item
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

const GroceryList: React.FC = () => {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState<number | ''>(1);
  const [newItemUnit, setNewItemUnit] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('grocery_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItems(data || []);
    } catch (err: any) {
      console.error('Error fetching grocery items:', err);
      setError('Error al cargar la lista: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();

    // Set up Realtime subscription
    const channel = supabase
      .channel('grocery-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items' }, (payload) => {
        // For simplicity, re-fetch all items on any change.
        // For larger apps, more granular updates could be implemented.
        fetchItems();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchItems]);

  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newItemName.trim()) {
      setError('El nombre del artículo no puede estar vacío.');
      return;
    }
    if (newItemQuantity === '' || newItemQuantity <= 0) {
      setError('La cantidad debe ser un número positivo.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      // user_id can be null in grocery_items
      const currentUserId = user ? user.id : null;

      const { error } = await supabase
        .from('grocery_items')
        .insert({
          user_id: currentUserId,
          name: newItemName.trim(),
          quantity: newItemQuantity,
          unit: newItemUnit.trim() || null,
        });

      if (error) throw error;

      setNewItemName('');
      setNewItemQuantity(1);
      setNewItemUnit('');
      // fetchItems will be called by the Realtime subscription
    } catch (err: any) {
      console.error('Error adding item:', err);
      setError('Error al añadir artículo: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBought = async (id: string, currentStatus: boolean) => {
    setError(null);
    try {
      const { error } = await supabase
        .from('grocery_items')
        .update({ is_bought: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      // fetchItems will be called by the Realtime subscription
    } catch (err: any) {
      console.error('Error updating item:', err);
      setError('Error al actualizar artículo: ' + err.message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este artículo?')) {
      return;
    }
    setError(null);
    try {
      const { error } = await supabase
        .from('grocery_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      // fetchItems will be called by the Realtime subscription
    } catch (err: any) {
      console.error('Error deleting item:', err);
      setError('Error al eliminar artículo: ' + err.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: '600px', margin: 'auto', padding: '16px' }}
    >
      <Typography variant="h4" component="h1" gutterBottom color="primary" textAlign="center">
        Lista de Mercado
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        <Typography variant="h6" gutterBottom color="text.primary">Añadir Nuevo Artículo</Typography>
        <Box component="form" onSubmit={handleAddItem} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Artículo"
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            fullWidth
            required
            variant="outlined"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Cantidad"
              type="number"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(parseFloat(e.target.value) || '')}
              fullWidth
              required
              variant="outlined"
              inputProps={{ min: "1" }}
            />
            <TextField
              label="Unidad (Opcional)"
              type="text"
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
              fullWidth
              variant="outlined"
            />
          </Box>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <AddCircleOutlineIcon />}
            sx={{ mt: 1, height: 50 }}
          >
            {submitting ? 'Guardando...' : 'Añadir a la Lista'}
          </Button>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, bgcolor: 'background.paper' }}>
        <Typography variant="h6" gutterBottom color="text.primary">Artículos de la Lista</Typography>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress color="primary" /></Box>}
        {!loading && items.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
            La lista de mercado está vacía.
          </Typography>
        )}
        <List>
          {items.map((item) => (
            <ListItem
              key={item.id}
              divider
              sx={{
                bgcolor: item.is_bought ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                borderRadius: 1,
                mb: 1,
                textDecoration: item.is_bought ? 'line-through' : 'none',
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={item.is_bought}
                    onChange={() => handleToggleBought(item.id, item.is_bought)}
                    name={`item-${item.id}`}
                    color="primary"
                  />
                }
                label={
                  <ListItemText
                    primary={
                      <Typography component="span" variant="body1" sx={{ fontWeight: 'bold' }}>
                        {item.name}
                      </Typography>
                    }
                    secondary={
                      <Typography component="span" variant="body2" color="text.secondary" display="block">
                        {item.quantity} {item.unit}
                      </Typography>
                    }
                  />
                }
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteItem(item.id)}>
                  <DeleteIcon color="error" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>
    </motion.div>
  );
};

export default GroceryList;