import { Request, Response, NextFunction } from 'express';

// Manejo centralizado de errores
export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error capturado:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Error interno del servidor',
  });
};
