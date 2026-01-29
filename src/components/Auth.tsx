import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Box, TextField, Button, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { motion } from 'framer-motion';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and signup
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let response;
      if (isLogin) {
        response = await supabase.auth.signInWithPassword({ email, password });
      } else {
        response = await supabase.auth.signUp({ email, password });
      }

      if (response.error) throw response.error;

      setMessage({ type: 'success', text: isLogin ? '¡Inicio de sesión exitoso!' : '¡Registro exitoso! Por favor, revisa tu correo para verificar tu cuenta.' });
      // Clear form on success
      setEmail('');
      setPassword('');

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Ocurrió un error inesperado.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Paper elevation={3} sx={{ p: 4, mt: 8, maxWidth: 400, mx: 'auto', bgcolor: 'background.paper' }}>
        <Typography variant="h4" component="h1" gutterBottom textAlign="center" color="primary">
          {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
        </Typography>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}
        <Box component="form" onSubmit={handleAuth} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            variant="outlined"
            disabled={loading}
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            variant="outlined"
            disabled={loading}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            sx={{ mt: 1, height: 50 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : (isLogin ? 'Ingresar' : 'Registrar')}
          </Button>
          <Button
            variant="text"
            color="secondary"
            fullWidth
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            sx={{ mt: 1 }}
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
          </Button>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default Auth;
