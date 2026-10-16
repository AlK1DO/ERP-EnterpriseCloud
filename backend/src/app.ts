import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Montar rutas de la API
app.use('/api', routes);

// Manejador de errores
app.use(errorHandler);

export default app;
