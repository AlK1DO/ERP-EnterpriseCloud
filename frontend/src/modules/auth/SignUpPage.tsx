import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, UserRoundPlus } from 'lucide-react';
import { AuthFrame } from './AuthFrame';
import { isValidEmail } from './authValidation';
import { resendConfirmation, signInWithGoogle, signUp } from './authApi';
import styles from './LoginPage.module.css';

type RegistrationField = 'name' | 'email' | 'password' | 'confirmation';
const fields: { name: RegistrationField; label: string; autoComplete: string }[] = [
  { name: 'name', label: 'Nombre', autoComplete: 'name' },
  { name: 'email', label: 'Correo electrónico', autoComplete: 'email' },
  { name: 'password', label: 'Contraseña', autoComplete: 'new-password' },
  { name: 'confirmation', label: 'Confirmación de contraseña', autoComplete: 'new-password' },
];

export function SignUpPage() {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Partial<Record<RegistrationField, string>>>({});
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  function fieldValue(name: RegistrationField) {
    return formRef.current?.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value ?? '';
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || googlePending) return;
    const name = fieldValue('name').trim();
    const email = fieldValue('email').trim();
    const password = fieldValue('password');
    const confirmation = fieldValue('confirmation');
    const next: Partial<Record<RegistrationField, string>> = {};
    if (!name) next.name = 'Ingresa tu nombre.';
    else if (name.length > 100) next.name = 'El nombre admite hasta 100 caracteres.';
    if (!isValidEmail(email)) next.email = 'Ingresa un correo electrónico válido.';
    if (!password.trim() || password.length < 8) next.password = 'Usa una contraseña de al menos 8 caracteres.';
    if (!confirmation || password !== confirmation) next.confirmation = 'Las contraseñas deben coincidir.';
    setErrors(next);
    setMessage('');
    const first = fields.find(field => next[field.name]);
    if (first) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${first.name}"]`)?.focus();
      return;
    }
    setPending(true);
    const result = await signUp(name, email, password);
    for (const name of ['password', 'confirmation']) {
      const input = formRef.current?.querySelector<HTMLInputElement>(`[name="${name}"]`);
      if (input) input.value = '';
    }
    setShowPassword(false);
    setPending(false);
    setAwaitingConfirmation(!result.error && !result.hasSession);
    setMessage(result.error ?? (result.hasSession ? 'Cuenta creada. Comprobando tu sesión…' : 'Revisa tu correo para activar tu cuenta'));
  }

  async function handleGoogleSignIn() {
    if (pending || googlePending) return;
    setGooglePending(true);
    setMessage('');
    const error = await signInWithGoogle();
    setMessage(error ?? 'Conectando con Google…');
    setGooglePending(false);
  }

  async function handleResend() {
    if (pending || googlePending) return;
    const email = fieldValue('email').trim();
    if (!isValidEmail(email)) {
      setErrors(current => ({ ...current, email: 'Ingresa un correo electrónico válido.' }));
      return;
    }
    setPending(true);
    const error = await resendConfirmation(email);
    setMessage(error ?? 'Revisa tu correo para activar tu cuenta');
    setPending(false);
  }

  return <AuthFrame title="Crea tu cuenta" description="Regístrate con tu correo para comenzar a utilizar ERP Senatinos" icon={<UserRoundPlus size={25} aria-hidden="true" />}>
    <form ref={formRef} className={styles.form} noValidate onSubmit={handleSubmit}>
      {fields.map(field => {
        const secret = field.name === 'password' || field.name === 'confirmation';
        return <div className={styles.field} key={field.name}>
          <label className={styles.label} htmlFor={`${id}-${field.name}`}>{field.label}</label>
          <div className={`${styles.inputWrapper} ${errors[field.name] ? styles.invalid : ''}`}>
            <input className={styles.input} id={`${id}-${field.name}`} name={field.name} type={secret ? showPassword ? 'text' : 'password' : field.name === 'email' ? 'email' : 'text'} required disabled={pending || googlePending} autoComplete={field.autoComplete} maxLength={field.name === 'name' ? 100 : undefined} autoCapitalize={field.name === 'email' ? 'none' : undefined} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `${id}-${field.name}-error` : field.name === 'password' ? `${id}-password-help` : undefined} onChange={() => {
              setErrors(current => ({ ...current, [field.name]: undefined }));
              setMessage('');
            }} />
            {secret && <button type="button" className={styles.visibilityButton} aria-label={showPassword ? `Ocultar ${field.label.toLowerCase()}` : `Mostrar ${field.label.toLowerCase()}`} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button>}
          </div>
          {field.name === 'password' && <p id={`${id}-password-help`} className={styles.helperText}>Al menos 8 caracteres. Supabase puede exigir requisitos adicionales.</p>}
          {errors[field.name] && <p id={`${id}-${field.name}-error`} className={styles.error} role="alert">{errors[field.name]}</p>}
        </div>;
      })}
      <button type="submit" className={styles.submitButton} disabled={pending || googlePending}>{pending ? 'Procesando…' : 'Crear cuenta'}<ArrowRight size={19} aria-hidden="true" /></button>
      <div className={styles.alternativeAuth}><span>o continúa con</span></div>
      <button className={styles.googleButton} type="button" disabled={pending || googlePending} onClick={() => void handleGoogleSignIn()}>
        <span className={styles.googleMark} aria-hidden="true">G</span>
        {googlePending ? 'Conectando con Google…' : 'Continuar con Google'}
      </button>
      <p className={styles.description} role="status" aria-live="polite">{message}</p>
      {awaitingConfirmation && <button type="button" className={styles.secondaryButton} disabled={pending || googlePending} onClick={() => void handleResend()}>Reenviar correo de activación</button>}
    </form>
    <Link className={styles.textLink} to="/login">¿Ya tienes cuenta? Inicia sesión</Link>
    <p className={styles.demoCaption}>El registro público crea una cuenta de Cliente. La activación y el acceso se validan con Supabase.</p>
  </AuthFrame>;
}
