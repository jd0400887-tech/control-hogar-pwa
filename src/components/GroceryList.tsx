import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import EditIcon from '@mui/icons-material/Edit';
import Header from './Header';

// --- (Types and Helper Functions) ---
interface GroceryItem {
  id: string;
  user_id: string | null;
  name: string;
  quantity: number;
  unit?: string;
  is_bought: boolean;
  is_archived: boolean;
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
  const [showArchived, setShowArchived] = useState(false);
  const [showBoughtItems, setShowBoughtItems] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'time' | 'alpha'>('time');

  // State for Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<GroceryItem | null>(null);

  // State for Edit Modal Form
  const [editedItemName, setEditedItemName] = useState('');
  const [editedItemCategory, setEditedItemCategory] = useState('');

  useEffect(() => {
    if (itemToEdit) {
      setEditedItemName(itemToEdit.name);
      setEditedItemCategory(itemToEdit.category || 'Otros');
    }
  }, [itemToEdit]);

  // State for Undo functionality
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [lastCompletedItem, setLastCompletedItem] = useState<GroceryItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Define the static list of both household user IDs to ensure symmetrical data fetching.
      // The user must replace the placeholder with their actual main user ID.
      const householdUserIds = [
        'c1ff78a6-4740-4734-b6d8-024cd85008f0', 
        '45fc4c0d-f1ed-47bc-9fab-2ccda8e105a7'
      ];

      const { data, error } = await supabase
        .from('grocery_items')
        .select('*')
        .in('user_id', householdUserIds)
        .order('created_at', { ascending: false });

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
        is_archived: false, // Ensure new items are not archived
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
    
    const isNowBuying = !item.is_bought;

    if (isNowBuying) {
      setLastCompletedItem(item);
      setSnackbarOpen(true);
    }
    
    try {
      await supabase.from('grocery_items').update({ 
        is_bought: isNowBuying,
        bought_at: isNowBuying ? new Date().toISOString() : null // Set timestamp if buying, null if undoing
      }).eq('id', item.id);
    } catch (err: any) {
      setError('Error al actualizar artículo: ' + err.message);
    }
  };

  const handleArchiveItem = async (id: string) => {
    setError(null);
    try {
      await supabase.from('grocery_items').update({ is_archived: true }).eq('id', id);
    } catch (err: any) {
      setError('Error al archivar artículo: ' + err.message);
    }
  };

  const handleUnarchiveItem = async (name: string) => {
    setError(null);
    try {
      // 1. Find all archived items with this name to get their IDs
      const { data: itemsToDelete, error: fetchError } = await supabase
        .from('grocery_items')
        .select('id')
        .eq('name', name)
        .eq('is_archived', true);

      if (fetchError) throw fetchError;
      const idsToDelete = itemsToDelete.map(item => item.id);

      // 2. Delete all those old archived items
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase.from('grocery_items').delete().in('id', idsToDelete);
        if (deleteError) throw deleteError;
      }

      // 3. Add a single new item back to the pending list
      const { data: { user } } = await supabase.auth.getUser();
      const category = categorizeItem(name);
      const { error: insertError } = await supabase.from('grocery_items').insert({
        user_id: user?.id,
        name: name,
        quantity: 1, // Default quantity
        is_bought: false,
        is_archived: false,
        category: category,
      });
      if (insertError) throw insertError;

    } catch (err: any) {
      setError('Error al desarchivar artículo: ' + err.message);
    }
  };

  const handleUndo = async () => {
    if (lastCompletedItem) {
      await handleToggleBought(lastCompletedItem);
      setSnackbarOpen(false);
      setLastCompletedItem(null);
    }
  };

  const handleSnackbarClose = (_event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const handleOpenEditModal = (item: GroceryItem) => {
    setItemToEdit(item);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setItemToEdit(null);
  };

  const handleUpdateItem = async () => {
    if (!itemToEdit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('grocery_items')
        .update({ name: editedItemName, category: editedItemCategory })
        .eq('id', itemToEdit.id);
      
      if (error) throw error;
      
      handleCloseEditModal();
    } catch (err: any) {
      setError('Error al actualizar el artículo: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToEdit) return;

    if (window.confirm(`¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE "${itemToEdit.name}"? Esta acción no se puede deshacer.`)) {
      try {
        const { error } = await supabase
          .from('grocery_items')
          .delete()
          .eq('id', itemToEdit.id);

        if (error) throw error;
        
        handleCloseEditModal();
      } catch (err: any) {
        setError('Error al eliminar el artículo: ' + err.message);
      }
    }
  };


  const pendingItems = items.filter(item => !item.is_bought && !item.is_archived);
  const boughtItems = items.filter(item => item.is_bought && !item.is_archived);
  const archivedItems = items.filter(item => item.is_archived);

  const groupItems = (itemsToGroup: GroceryItem[]) => itemsToGroup.reduce((acc, item) => {
    const category = item.category || 'Otros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as { [key: string]: GroceryItem[] });

  const allCategories = useMemo(() => ['All', ...new Set(pendingItems.map(item => item.category || 'Otros'))], [pendingItems]);

  const groupedPendingItems = useMemo(() => {
    let processedItems = [...pendingItems];

    // Filter by category
    if (categoryFilter !== 'All') {
      processedItems = processedItems.filter(item => (item.category || 'Otros') === categoryFilter);
    }

    // Sort items
    if (sortBy === 'alpha') {
      processedItems.sort((a, b) => a.name.localeCompare(b.name));
    }
    // 'time' sort is the default as items are fetched in that order

    // Group items
    return groupItems(processedItems);

  }, [pendingItems, categoryFilter, sortBy]);

  const groupedBoughtItems = groupItems(boughtItems);
  
  // Create a de-duplicated list for the archived view
  const uniqueArchivedItems = [...new Map(archivedItems.map(item => [item.name, item])).values()];
  const groupedArchivedItems = groupItems(uniqueArchivedItems);



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: '600px', margin: 'auto', padding: '16px' }}
    >
      <Header />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Add Item Form */}
      <Paper elevation={3} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
        <Typography variant="body1" gutterBottom color="text.primary">Añadir Nuevo Artículo</Typography>
        <Box component="form" onSubmit={handleAddItem} sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Añadir item y presionar Enter..."
            type="text"
            value={smartInput}
            onChange={(e) => setSmartInput(e.target.value)}
            fullWidth
            required
            variant="outlined"
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton type="submit" disabled={submitting} edge="end">
                    {submitting ? <CircularProgress size={24} /> : <AddCircleOutlineIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      {/* Loading Spinner */}
      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress color="primary" /></Box>}

      {/* Pending Items */}
      {!loading && (
        <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" gutterBottom color="text.primary">Artículos Pendientes</Typography>
            <IconButton onClick={() => setSortBy(sortBy === 'alpha' ? 'time' : 'alpha')} color={sortBy === 'alpha' ? 'primary' : 'default'}>
              <SortByAlphaIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 2 }}>
            {allCategories.map(category => (
              <Chip
                key={category}
                label={category}
                onClick={() => setCategoryFilter(category)}
                variant={categoryFilter === category ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Box>
          {Object.keys(groupedPendingItems).length === 0 && <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>¡No hay nada pendiente para esta categoría!</Typography>}
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
            <AnimatePresence>
              {Object.keys(groupedPendingItems).sort().map(category => (
                <React.Fragment key={category}>
                  <ListSubheader sx={{ bgcolor: 'background.paper' }}>{category}</ListSubheader>
                  {groupedPendingItems[category].map((item) => (
                    <motion.div key={item.id} layout exit={{ opacity: 0, x: -300, height: 0 }} transition={{ duration: 0.4 }}>
                      <ListItem divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1, mb: 1 }}>
                        <FormControlLabel
                          control={<Checkbox checked={item.is_bought} onChange={() => handleToggleBought(item)} name={`item-${item.id}`} color="primary"/>}
                          label={<ListItemText primary={<Typography component="span" variant="body2" sx={{ fontWeight: 'bold' }}>{item.name}</Typography>} secondary={<Typography component="span" variant="caption">{`${item.quantity} ${item.unit || ''}`}</Typography>}/>}
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditModal(item)}>
                            <EditIcon />
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
      )}

      {/* Bought Items */}
      {!loading && boughtItems.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
          <Typography variant="body1" gutterBottom color="text.primary" onClick={() => setShowBoughtItems(!showBoughtItems)} sx={{ cursor: 'pointer' }}>
            Artículos Comprados
          </Typography>
          {showBoughtItems && (
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
              <AnimatePresence>
                {Object.keys(groupedBoughtItems).sort().map(category => (
                  <React.Fragment key={category}>
                    <ListSubheader sx={{ bgcolor: 'background.paper' }}>{category}</ListSubheader>
                    {groupedBoughtItems[category].map((item) => (
                      <motion.div key={item.id} layout exit={{ opacity: 0, x: 300, height: 0 }} transition={{ duration: 0.4 }}>
                        <ListItem divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1, mb: 1, textDecoration: 'line-through', color: 'text.secondary' }}>
                          <FormControlLabel
                            control={<Checkbox checked={item.is_bought} onChange={() => handleToggleBought(item)} name={`item-${item.id}`} color="primary"/>}
                            label={<ListItemText primary={<Typography component="span" variant="body2">{item.name}</Typography>} secondary={<Typography component="span" variant="caption">{`${item.quantity} ${item.unit || ''}`}</Typography>}/>}
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="edit" sx={{ mr: 1 }} onClick={() => handleOpenEditModal(item)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="archive" onClick={() => handleArchiveItem(item.id)}>
                              <ArchiveIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      </motion.div>
                    ))}
                  </React.Fragment>
                ))}
              </AnimatePresence>
            </List>
          )}
        </Paper>
      )}

      {/* Archived Items */}
      {!loading && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Ocultar Archivados' : `Mostrar ${uniqueArchivedItems.length} Archivados`}
          </Button>
          {showArchived && (
            <Paper elevation={3} sx={{ p: 3, mt: 2, bgcolor: 'background.paper' }}>
              <Typography variant="body1" gutterBottom color="text.primary">Archivados</Typography>
              {uniqueArchivedItems.length === 0 && <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>No hay artículos archivados.</Typography>}
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
                <AnimatePresence>
                  {Object.keys(groupedArchivedItems).sort().map(category => (
                    <React.Fragment key={category}>
                      <ListSubheader sx={{ bgcolor: 'background.paper' }}>{category}</ListSubheader>
                      {groupedArchivedItems[category].map((item) => (
                        <motion.div key={item.id} layout exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                          <ListItem divider sx={{ borderRadius: 1, mb: 1 }}>
                            <ListItemText primary={<Typography component="span" variant="body2" sx={{ color: 'text.disabled' }}>{item.name}</Typography>} />
                            <ListItemSecondaryAction>
                              <IconButton edge="end" aria-label="unarchive" onClick={() => handleUnarchiveItem(item.name)}>
                                <UnarchiveIcon color="secondary" />
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
          )}
        </Box>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        message="Artículo completado"
        action={<Button color="secondary" size="small" onClick={handleUndo}>DESHACER</Button>}
      />

      {/* Edit Item Modal */}
      <Dialog open={editModalOpen} onClose={handleCloseEditModal} fullWidth maxWidth="sm">
        <DialogTitle>Editar Artículo</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre del Artículo"
            type="text"
            fullWidth
            variant="standard"
            value={editedItemName}
            onChange={(e) => setEditedItemName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 3 }}>
            <InputLabel>Categoría</InputLabel>
            <Select
              value={editedItemCategory}
              label="Categoría"
              onChange={(e) => setEditedItemCategory(e.target.value)}
            >
              {Object.keys(categoryKeywords).map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
              <MenuItem value="Otros">Otros</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleDeleteItem} color="error">Eliminar</Button>
          <Box>
            <Button onClick={handleCloseEditModal}>Cancelar</Button>
            <Button onClick={handleUpdateItem} color="primary" disabled={submitting}>
              {submitting ? <CircularProgress size={24} /> : 'Guardar'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default GroceryList;
