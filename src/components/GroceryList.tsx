import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, CircularProgress, List, ListItem, ListItemText,
  ListItemSecondaryAction, IconButton, Checkbox, FormControlLabel, Alert, Paper, Snackbar, ListSubheader
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// --- (Types and Helper Functions) ---
interface GroceryItem {
  id: string;
  user_id: string | null;
  name: string;
  quantity: number;
  unit?: string;
  is_bought: boolean;
  category?: string; // Added category field
  created_at: string;
  updated_at: string;
}

const parseGroceryInput = (input: string): { name: string; quantity: number; unit: string | null } => {
  let text = ` ${input.toLowerCase().trim()} `;
  let quantity = 1;
  let unit: string | null = null;
  const quantityMatch = text.match(/ (\d+\.?\d*|\d+\/\d+|\d+) /);
  if (quantityMatch) {
    const numStr = quantityMatch[1];
    if (numStr.includes('/')) {
      const parts = numStr.split('/');
      quantity = parseInt(parts[0], 10) / parseInt(parts[1], 10);
    } else {
      quantity = parseFloat(numStr);
    }
    text = text.replace(quantityMatch[0], ' ');
  }
  const units = ['kg', 'kilo', 'kilos', 'gramos', 'gr', 'g', 'litro', 'litros', 'lts', 'lt', 'l', 'ml', 'unidad', 'unidades', 'caja', 'cajas', 'botella', 'botellas', 'paquete', 'paquetes'];
  const unitRegex = new RegExp(`\\b(${units.join('|')})s?\\b`);
  const unitMatch = text.match(unitRegex);
  if (unitMatch) {
    unit = unitMatch[0];
    text = text.replace(unitMatch[0], ' ');
  }
  let name = text.replace(/\sde\s/g, ' ').trim().replace(/ +/g, ' ');
  name = name.charAt(0).toUpperCase() + name.slice(1);
  return { name, quantity, unit };
};

const categoryKeywords: { [key: string]: string[] } = {
  'Frutas y Verduras': ['manzana', 'platano', 'naranja', 'fresa', 'uva', 'lechuga', 'tomate', 'cebolla', 'patata', 'zanahoria', 'aguacate', 'pimiento', 'limon'],
  'Carnes y Pescados': ['pollo', 'carne', 'res', 'cerdo', 'pescado', 'salmon', 'atun', 'jamon'],
  'Lácteos y Huevos': ['leche', 'queso', 'yogur', 'mantequilla', 'crema', 'huevo'],
  'Panadería y Cereales': ['pan', 'baguette', 'tostada', 'croissant', 'cereal', 'avena', 'arroz', 'pasta'],
  'Bebidas': ['agua', 'zumo', 'refresco', 'cerveza', 'vino', 'cafe', 'te'],
  'Limpieza': ['jabon', 'detergente', 'lejia', 'limpiador', 'esponja', 'servilleta', 'papel'],
  'Higiene Personal': ['champu', 'acondicionador', 'gel', 'pasta de dientes', 'desodorante'],
};

const categorizeItem = (itemName: string): string => {
  const lowerItemName = itemName.toLowerCase();
  for (const category in categoryKeywords) {
    if (categoryKeywords[category].some(keyword => lowerItemName.includes(keyword))) {
      return category;
    }
  }
  return 'Otros';
};


// --- (Main Component) ---
const GroceryList: React.FC = () => {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [smartInput, setSmartInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // State for Undo functionality
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [lastCompletedItem, setLastCompletedItem] = useState<GroceryItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('grocery_items').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      setError('Error al cargar la lista: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const channel = supabase.channel('grocery-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items' }, fetchItems).subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchItems]);

  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!smartInput.trim()) {
      setError('El campo no puede estar vacío.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const { name, quantity, unit } = parseGroceryInput(smartInput);
    const category = categorizeItem(name);

    if (!name) {
        setError('No se pudo determinar el nombre del artículo.');
        setSubmitting(false);
        return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('grocery_items').insert({
        user_id: user?.id,
        name,
        quantity,
        unit,
        category, // Save the auto-detected category
      });
      if (error) throw error;
      setSmartInput('');
    } catch (err: any) {
      setError('Error al añadir artículo: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBought = async (item: GroceryItem) => {
    setError(null);
    if (!item.is_bought) {
      setLastCompletedItem(item);
      setSnackbarOpen(true);
    }
    try {
      await supabase.from('grocery_items').update({ is_bought: !item.is_bought }).eq('id', item.id);
    } catch (err: any) {
      setError('Error al actualizar artículo: ' + err.message);
    }
  };

  const handleUndo = async () => {
    if (lastCompletedItem) {
      await handleToggleBought(lastCompletedItem);
      setSnackbarOpen(false);
      setLastCompletedItem(null);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este artículo?')) return;
    setError(null);
    try {
      await supabase.from('grocery_items').delete().eq('id', id);
    } catch (err: any) {
      setError('Error al eliminar artículo: ' + err.message);
    }
  };

  const handleSnackbarClose = (_event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const pendingItems = items.filter(item => !item.is_bought);
  const groupedItems = pendingItems.reduce((acc, item) => {
    const category = item.category || 'Otros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as { [key: string]: GroceryItem[] });

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
            label="Ej: 2 litros de leche, Pan integral, 6 manzanas..."
            type="text"
            value={smartInput}
            onChange={(e) => setSmartInput(e.target.value)}
            fullWidth
            required
            variant="outlined"
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
            {submitting ? 'Guardando...' : 'Añadir a la Lista'}
          </Button>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, bgcolor: 'background.paper' }}>
        <Typography variant="h6" gutterBottom color="text.primary">Artículos Pendientes</Typography>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress color="primary" /></Box>}
        {!loading && pendingItems.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
            ¡No hay nada pendiente!
          </Typography>
        )}
        <List sx={{ width: '100%' }}>
          <AnimatePresence>
            {Object.keys(groupedItems).sort().map(category => (
              <React.Fragment key={category}>
                <ListSubheader sx={{ bgcolor: 'background.paper' }}>{category}</ListSubheader>
                {groupedItems[category].map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 1, height: 'auto' }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, x: -300, height: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <ListItem
                      divider
                      sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1, mb: 1 }}
                    >
                      <FormControlLabel
                        control={<Checkbox checked={false} onChange={() => handleToggleBought(item)} name={`item-${item.id}`} color="primary"/>}
                        label={<ListItemText primary={<Typography component="span" variant="body1" sx={{ fontWeight: 'bold' }}>{item.name}</Typography>} secondary={<Typography component="span" variant="body2" color="text.secondary">{item.quantity} {item.unit}</Typography>}/>}
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteItem(item.id)}>
                          <DeleteIcon color="error" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </motion.div>
                ))}
                </React.Fragment>
            ))}
          </AnimatePresence>
        </List>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message="Artículo completado"
        action={<Button color="secondary" size="small" onClick={handleUndo}>DESHACER</Button>}
      />
    </motion.div>
  );
};

export default GroceryList;
