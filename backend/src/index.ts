import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabaseClient';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Ruta de Salud y Diagnóstico
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('almacenes').select('count', { count: 'exact', head: true });
    
    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Error al conectar con Supabase',
        error: error.message
      });
    }

    res.json({
      status: 'ok',
      message: 'Backend ERP EnterpriseCloud conectado exitosamente a Supabase',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Endpoint opcional para consultar datos SUNAT/RENIEC mediante Migo API desde el servidor
app.get('/api/consulta-documento/:tipo/:num', async (req, res) => {
  const { tipo, num } = req.params;
  const token = process.env.MIGO_TOKEN || '759ebb1b-6c5c-402b-8211-fad6e99644a5';

  try {
    const endpoint = tipo.toLowerCase() === 'dni' 
      ? 'https://api.migo.pe/api/v1/dni'
      : 'https://api.migo.pe/api/v1/ruc';

    const bodyData = tipo.toLowerCase() === 'dni' ? { token, dni: num } : { token, ruc: num };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 ERP EnterpriseCloud Backend escuchando en http://localhost:${port}`);
});
