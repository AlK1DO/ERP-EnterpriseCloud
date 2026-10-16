import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// Verificar conexion a la base de datos y estado general
export const checkHealth = async (_req: Request, res: Response) => {
  try {
    const { error } = await supabase.from('almacenes').select('count', { count: 'exact', head: true });

    if (error) {
      return res.status(500).json({
        status: 'error',
        message: 'No se pudo conectar a la base de datos',
        error: error.message,
      });
    }

    return res.json({
      status: 'ok',
      message: 'Backend ERP EnterpriseCloud conectado correctamente a Supabase',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Error interno del servidor',
    });
  }
};
