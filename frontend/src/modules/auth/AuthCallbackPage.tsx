import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { completeConfirmation } from './authApi';
import { AuthFrame } from './AuthFrame';
import styles from './LoginPage.module.css';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void completeConfirmation(params).then(message => {
      if (!active) return;
      // Let Supabase detect and exchange URL credentials before removing them.
      window.history.replaceState(window.history.state, '', '/auth/callback');
      if (message) setError(message);
      else navigate('/', { replace: true });
    });
    return () => { active = false; };
  }, [params, navigate]);
  return <AuthFrame title={error ? 'Revisa tu enlace de activación' : 'Activando tu cuenta'} description={error ?? 'Espera mientras Supabase confirma tu correo y establece una sesión válida.'} icon={<MailCheck size={25} aria-hidden="true" />}>
    <p role="status" className={styles.description}>{error ? 'Puedes iniciar sesión o solicitar un nuevo correo desde el registro.' : 'Procesando confirmación…'}</p>
    {error && <Link className={styles.textLink} to="/login">Volver al inicio de sesión</Link>}
    {error && <Link className={styles.textLink} to="/registro">Solicitar otro correo de activación</Link>}
  </AuthFrame>;
}
