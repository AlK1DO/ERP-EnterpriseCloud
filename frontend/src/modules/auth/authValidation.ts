export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
  switch (code) {
    case 'invalid_credentials': return 'El correo o la contraseña son incorrectos.';
    case 'email_not_confirmed': return 'Revisa tu correo para activar tu cuenta antes de iniciar sesión.';
    case 'user_already_exists': return 'No se pudo crear la cuenta. Intenta iniciar sesión con tu correo.';
    case 'signup_disabled': return 'El registro de nuevas cuentas no está habilitado en Supabase.';
    case 'email_address_not_authorized': return 'No se pudo enviar el correo de activación a esta dirección. El administrador debe configurar el servicio SMTP de Supabase.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Se alcanzó el límite de solicitudes. Espera unos minutos e inténtalo de nuevo.';
    case 'weak_password': return 'La contraseña no cumple los requisitos configurados en Supabase. Usa al menos 8 caracteres y revisa los requisitos del proyecto.';
    case 'email_address_invalid': return 'Ingresa un correo electrónico válido.';
    case 'otp_expired': return 'El enlace de activación expiró o ya fue utilizado. Solicita otro correo de activación.';
    default: return 'No se pudo completar la solicitud. Revisa tu conexión y la configuración de Supabase e inténtalo de nuevo.';
  }
}
