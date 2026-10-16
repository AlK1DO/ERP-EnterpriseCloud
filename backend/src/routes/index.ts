import { Router } from 'express';
import healthRoutes from './healthRoutes';
import consultaRoutes from './consultaRoutes';

const router = Router();

// Agrupador de rutas API
router.use(healthRoutes);
router.use(consultaRoutes);

export default router;
