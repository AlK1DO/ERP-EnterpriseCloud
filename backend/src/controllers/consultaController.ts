import { Request, Response } from 'express';
import { config } from '../config/env';

// Consulta de DNI o RUC consumiendo el API de Migo
export const consultarDocumento = async (req: Request, res: Response) => {
  const tipo = String(req.params.tipo || '').toLowerCase();
  const num = String(req.params.num || '').trim();
  const token = config.migoToken;

  if (!tipo || !num) {
    return res.status(400).json({
      success: false,
      message: 'Tipo y numero de documento requeridos',
    });
  }

  try {
    const esDni = tipo === 'dni';
    const endpoint = esDni
      ? 'https://api.migo.pe/api/v1/dni'
      : 'https://api.migo.pe/api/v1/ruc';

    const bodyData = esDni ? { token, dni: num } : { token, ruc: num };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData),
    });

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Error al consultar documento',
    });
  }
};
