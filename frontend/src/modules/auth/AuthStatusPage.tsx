import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { AuthFrame } from './AuthFrame';
import { useAuth } from './AuthContext';
import styles from './LoginPage.module.css';

export function AuthStatusPage() {
  const auth = useAuth();
  const loading = auth.phase === 'loading';
  return <AuthFrame title={loading ? 'Comprobando tu sesión' : 'No se pudo habilitar el acceso'} description={loading ? 'Espera mientras validamos tu cuenta y consultamos tu empresa.' : auth.error ?? 'Revisa la configuración de Supabase.'} icon={loading ? <LoaderCircle size={25} aria-hidden="true" /> : <ShieldCheck size={25} aria-hidden="true" />}>
    <div role="status" aria-live="polite" aria-busy={loading} className={styles.form}>
      {loading ? <p className={styles.description}>Cargando…</p> : <><button type="button" className={styles.submitButton} onClick={() => void auth.refresh()}>Reintentar</button><button type="button" className={styles.secondaryButton} onClick={() => void auth.signOut()}>Cerrar sesión</button></>}
    </div>
  </AuthFrame>;
}
