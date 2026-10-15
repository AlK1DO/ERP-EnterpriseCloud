import type { Cliente } from '../../services/clientesService';
export function validateSalesClient(client: Cliente | null): asserts client is Cliente {
  if (!client || !client.id || client.estado !== 'Activo' || typeof client.nombre !== 'string' || !client.nombre.trim()
    || typeof client.documento !== 'string' || !(client.tipo_persona === 'JURIDICA' ? /^\d{11}$/ : client.tipo_persona === 'NATURAL' ? /^(\d{8}|\d{11})$/ : /a^/).test(client.documento)) throw new Error('Selecciona un cliente activo con nombre y documento válidos. Completa sus datos en Clientes; no se usarán ejemplos como sustituto.');
}
export function salesClientSnapshot(client: Cliente | null) {
  validateSalesClient(client);
  return { id: client.id, tipo_persona: client.tipo_persona, nombre: client.nombre, documento: client.documento,
    direccion: client.direccion || null, email: client.email || null, telefono: client.telefono || null,
    limite_credito: typeof client.limite_credito === 'number' && Number.isFinite(client.limite_credito) ? client.limite_credito : null };
}
