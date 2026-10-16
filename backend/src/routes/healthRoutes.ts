import { Router } from 'express';
import { checkHealth } from '../controllers/healthController';

const router = Router();

// Ruta de diagnostico
router.get('/health', checkHealth);

export default router;
