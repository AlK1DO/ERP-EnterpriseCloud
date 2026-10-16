import { Router } from 'express';
import { consultarDocumento } from '../controllers/consultaController';

const router = Router();

// Consulta SUNAT / RENIEC
router.get('/consulta-documento/:tipo/:num', consultarDocumento);

export default router;
