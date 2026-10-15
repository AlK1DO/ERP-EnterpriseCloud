import test from 'node:test';
import assert from 'node:assert/strict';
import { accessDecision } from '../src/modules/auth/accessPolicy.ts';
import { authErrorMessage, isValidEmail, normalizeEmail } from '../src/modules/auth/authValidation.ts';

const account = { phase: 'ready', user: { id: 'A' }, role: 'client', company: { ruc: '20123456789' } };
test('sin sesión no se accede a ninguna ruta protegida', () => {
  for (const mode of ['account', 'workspace', 'admin']) {
    assert.equal(accessDecision({ ...account, phase: 'anonymous', user: null }, mode), '/login');
  }
  assert.equal(accessDecision({ ...account, phase: 'anonymous' }, 'public'), 'allow');
});
test('validación pendiente o fallida bloquea todas las entradas', () => {
  for (const phase of ['loading', 'error']) for (const mode of ['public', 'account', 'workspace', 'admin']) {
    assert.equal(accessDecision({ ...account, phase }, mode), 'status');
  }
});
test('perfil sin usuario o rol inválido no concede acceso', () => {
  assert.equal(accessDecision({ ...account, role: null }, 'workspace'), 'status');
  assert.equal(accessDecision({ ...account, role: 'owner' }, 'workspace'), 'status');
  assert.equal(accessDecision({ ...account, user: null }, 'workspace'), 'status');
});
test('cliente sin empresa completa registro sin bucle de redirección', () => {
  const auth = { ...account, company: null };
  assert.equal(accessDecision(auth, 'workspace'), '/registro-empresa');
  assert.equal(accessDecision(auth, 'public'), '/registro-empresa');
  assert.equal(accessDecision(auth, 'account'), 'allow');
});
test('cliente con empresa entra al ERP pero no a administración', () => {
  assert.equal(accessDecision(account, 'workspace'), 'allow');
  assert.equal(accessDecision(account, 'public'), '/');
  assert.equal(accessDecision(account, 'admin'), '/');
});
test('administrador entra sin empresa; metadatos no elevan rol', () => {
  assert.equal(accessDecision({ ...account, role: 'admin', company: null }, 'admin'), 'allow');
  assert.equal(accessDecision({ ...account, user: { user_metadata: { role: 'admin' } } }, 'admin'), '/');
});
test('contraseña incorrecta y correo no confirmado tienen mensajes diferenciados', () => {
  assert.match(authErrorMessage({ code: 'invalid_credentials' }), /incorrectos/);
  assert.match(authErrorMessage({ code: 'email_not_confirmed' }), /activar/);
  assert.equal(normalizeEmail(' USER@EXAMPLE.COM '), 'user@example.com');
  assert.equal(isValidEmail('invalid'), false);
});
