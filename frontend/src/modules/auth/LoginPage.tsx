import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Info, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import styles from './LoginPage.module.css';
import { isValidEmail } from './authValidation';
import { signIn, signInWithGoogle } from './authApi';
import { BrandPanel } from './BrandPanel';

type AccessVariant = 'user' | 'admin';
type FieldErrors = { email?: string; password?: string };

const accessContent = {
  user: { title: 'Bienvenido de nuevo', description: 'Ingresa para continuar con tus operaciones', icon: UserRound },
  admin: { title: 'Acceso de administrador', description: 'Ingresa al panel de administración de tu empresa', icon: ShieldCheck },
};

export function LoginPage({ previewOnly = false }: { previewOnly?: boolean } = {}) {
  const id = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const googleReturnError = new URLSearchParams(location.search).get('google');
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [variant, setVariant] = useState<AccessVariant>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState(() => googleReturnError === 'cancelled'
    ? 'Cancelaste el inicio de sesión con Google. Puedes intentarlo de nuevo.'
    : googleReturnError === 'failed'
      ? 'Google no pudo completar el inicio de sesión. Inténtalo de nuevo.'
      : '');
  const [pending, setPending] = useState(false);
  const content = accessContent[variant];
  const AccessIcon = content.icon;

  useEffect(() => {
    if (googleReturnError !== 'cancelled' && googleReturnError !== 'failed') return;
    navigate('/login', { replace: true });
  }, [googleReturnError, navigate]);

  function selectVariant(nextVariant: AccessVariant) {
    setVariant(nextVariant);
    setNotice('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const email = emailRef.current?.value.trim() ?? '';
    const password = passwordRef.current?.value ?? '';
    const nextErrors: FieldErrors = {};
    if (!email) nextErrors.email = 'Ingresa tu correo electrónico.';
    else if (!isValidEmail(email)) nextErrors.email = 'Ingresa un correo electrónico válido.';
    if (!password.trim()) nextErrors.password = 'Ingresa tu contraseña.';
    setErrors(nextErrors);
    setNotice('');
    if (nextErrors.email) emailRef.current?.focus();
    else if (nextErrors.password) passwordRef.current?.focus();
    else {
      if (previewOnly) {
        setNotice('Vista previa visual: no se envían credenciales ni se inicia sesión.');
        return;
      }
      setPending(true);
      const error = await signIn(email, password);
      if (passwordRef.current) passwordRef.current.value = '';
      setShowPassword(false);
      setNotice(error ?? 'Sesión iniciada. Comprobando tu perfil y empresa…');
      setPending(false);
    }
  }

  async function handleGoogleSignIn() {
    if (pending) return;
    if (previewOnly) {
      setNotice('Vista previa visual: no se inicia sesión con Google.');
      return;
    }
    setPending(true);
    setNotice('');
    const error = await signInWithGoogle();
    setNotice(error ?? 'Conectando con Google…');
    setPending(false);
  }

  function clearFeedback(field: keyof FieldErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setNotice('');
  }

  return (
    <main className={styles.page} lang="es">
      <div className={styles.card}>
        <BrandPanel />

        <section className={styles.formPanel} aria-labelledby={`${id}-title`}>
          <div className={styles.formContent}>
            <fieldset className={styles.accessSelector} disabled={pending}>
              <legend className={styles.selectorLabel}>Selecciona tu acceso</legend>
              <div className={styles.options}>
                {(['user', 'admin'] as const).map((option) => {
                  const OptionIcon = accessContent[option].icon;
                  return (
                    <label key={option} className={styles.option}>
                      <input className={styles.radio} type="radio" name={`${id}-access`} value={option} checked={variant === option} onChange={() => selectVariant(option)} />
                      <span className={styles.optionSurface}><OptionIcon size={18} aria-hidden="true" />{option === 'user' ? 'Cliente' : 'Administrador'}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <header className={styles.formHeading}>
              <span className={styles.accessIcon}><AccessIcon size={25} aria-hidden="true" /></span>
              <h1 id={`${id}-title`} className={styles.title}>{content.title}</h1>
              <p className={styles.description}>{content.description}</p>
            </header>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${id}-email`}>Correo electrónico</label>
                <div className={`${styles.inputWrapper} ${errors.email ? styles.invalid : ''}`}>
                  <Mail size={19} className={styles.fieldIcon} aria-hidden="true" />
                  <input ref={emailRef} id={`${id}-email`} className={styles.input} type="email" name="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="nombre@empresa.com" required disabled={pending} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? `${id}-email-error` : undefined} onChange={() => clearFeedback('email')} />
                </div>
                {errors.email && <p id={`${id}-email-error`} className={styles.error} role="alert">{errors.email}</p>}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${id}-password`}>Contraseña</label>
                <div className={`${styles.inputWrapper} ${errors.password ? styles.invalid : ''}`}>
                  <LockKeyhole size={19} className={styles.fieldIcon} aria-hidden="true" />
                  <input ref={passwordRef} id={`${id}-password`} className={styles.input} type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Ingresa tu contraseña" required disabled={pending} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? `${id}-password-error` : undefined} onChange={() => clearFeedback('password')} />
                  <button className={styles.visibilityButton} type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} aria-controls={`${id}-password`} onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                  </button>
                </div>
                {errors.password && <p id={`${id}-password-error`} className={styles.error} role="alert">{errors.password}</p>}
              </div>
              <button className={styles.submitButton} type="submit" disabled={pending}>{pending ? 'Iniciando sesión…' : 'Iniciar sesión'}<ArrowRight size={19} aria-hidden="true" /></button>
              <div className={styles.alternativeAuth}><span>o continúa con</span></div>
              <button className={styles.googleButton} type="button" disabled={pending} onClick={() => void handleGoogleSignIn()}>
                <span className={styles.googleMark} aria-hidden="true">G</span>
                {pending ? 'Conectando con Google…' : 'Continuar con Google'}
              </button>
              <div className={styles.notice} role="status" aria-live="polite" aria-atomic="true">
                {notice && <><Info size={17} aria-hidden="true" /><span>{notice}</span></>}
              </div>
            </form>
            {!previewOnly && <Link to="/registro" className={styles.textLink}>¿No tienes cuenta? Regístrate</Link>}
            <p className={styles.demoCaption}>{previewOnly ? 'Vista previa independiente, sin autenticación.' : 'El selector solo cambia la presentación. Tu rol se comprueba en el servidor.'}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
