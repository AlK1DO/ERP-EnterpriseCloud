import app from './app';
import { config } from './config/env';

const port = config.port;

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
