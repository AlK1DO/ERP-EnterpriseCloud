import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Building2, LogOut } from 'lucide-react';
import { BrandPanel } from './BrandPanel';
import { normalizeCompany, validateCompany } from './companyRegistration';
import type { CompanyData, CompanyErrors } from './companyRegistration';
import styles from './LoginPage.module.css';
import companyStyles from './CompanyRegistrationPage.module.css';

const companyFields: { name: keyof CompanyData; label: string; required?: boolean; type?: 'email' | 'tel'; placeholder: string; autoComplete: string }[] = [
  { name: 'ruc', label: 'RUC', required: true, placeholder: '11 dígitos', autoComplete: 'off' },
  { name: 'legalName', label: 'Razón social', required: true, placeholder: 'Nombre legal de tu empresa', autoComplete: 'organization' },
  { name: 'fiscalAddress', label: 'Dirección fiscal', required: true, placeholder: 'Calle, número y distrito', autoComplete: 'street-address' },
  { name: 'tradeName', label: 'Nombre comercial', placeholder: 'Nombre con el que se conoce tu empresa', autoComplete: 'off' },
  { name: 'phone', label: 'Teléfono', type: 'tel', placeholder: 'Teléfono de contacto', autoComplete: 'tel' },
  { name: 'email', label: 'Correo de la empresa', type: 'email', placeholder: 'contacto@empresa.com', autoComplete: 'email' },
];

export function CompanyRegistrationPage({ onSave, onSignOut }: {
  onSave: (company: CompanyData) => Promise<string | null>;
  onSignOut: () => void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<CompanyData>({ ruc: '', legalName: '', fiscalAddress: '', tradeName: '', phone: '', email: '' });
  const [errors, setErrors] = useState<CompanyErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const company = normalizeCompany(values);
    const nextErrors = validateCompany(company);
    setErrors(nextErrors);
    setSaveError(null);
    const firstError = companyFields.find(field => nextErrors[field.name]);
    if (firstError) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${firstError.name}"]`)?.focus();
      return;
    }
    setPending(true);
    try { setSaveError(await onSave(company)); }
    catch { setSaveError('No se pudo guardar la empresa. Tus campos se mantienen; inténtalo de nuevo.'); }
    finally { setPending(false); }
  }

  return (
    <main className={styles.page} lang="es">
      <div className={styles.card}>
        <BrandPanel />
        <section className={styles.formPanel} aria-labelledby={`${id}-title`}>
          <div className={styles.formContent}>
            <header className={styles.formHeading}>
              <span className={styles.accessIcon}><Building2 size={25} aria-hidden="true" /></span>
              <h1 id={`${id}-title`} className={styles.title}>Registra tu empresa</h1>
              <p className={styles.description}>Completa los datos de tu empresa para comenzar a utilizar ERP Senatinos</p>
            </header>
            <p className={companyStyles.requiredNote}>Los campos marcados con * son obligatorios.</p>
            <form ref={formRef} className={styles.form} noValidate onSubmit={handleSubmit}>
              {companyFields.map(field => (
                <div className={styles.field} key={field.name}>
                  <label className={styles.label} htmlFor={`${id}-${field.name}`}>{field.label}{field.required ? <span aria-hidden="true"> *</span> : <span className={companyStyles.optional}> (opcional)</span>}</label>
                  <div className={`${styles.inputWrapper} ${errors[field.name] ? styles.invalid : ''}`}>
                    <input id={`${id}-${field.name}`} className={styles.input} name={field.name} type={field.type ?? 'text'} inputMode={field.name === 'ruc' ? 'numeric' : undefined} autoComplete={field.autoComplete} required={field.required} disabled={pending} placeholder={field.placeholder} value={values[field.name]} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `${id}-${field.name}-error` : field.name === 'ruc' ? `${id}-ruc-help` : undefined} onChange={event => {
                      setValues(current => ({ ...current, [field.name]: event.target.value }));
                      setErrors(current => ({ ...current, [field.name]: undefined }));
                      setSaveError(null);
                    }} />
                  </div>
                  {field.name === 'ruc' && <p id={`${id}-ruc-help`} className={companyStyles.help}>Solo se valida el formato de 11 dígitos; no se consulta ni verifica ante SUNAT.</p>}
                  {errors[field.name] && <p id={`${id}-${field.name}-error`} className={styles.error} role="alert">{errors[field.name]}</p>}
                </div>
              ))}
              {saveError && <p className={companyStyles.storageError} role="alert">{saveError}</p>}
              <button className={styles.submitButton} type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar y continuar'}<ArrowRight size={19} aria-hidden="true" /></button>
              <button className={companyStyles.exitButton} type="button" disabled={pending} onClick={onSignOut}><LogOut size={17} aria-hidden="true" />Cerrar sesión</button>
            </form>
            <p className={styles.demoCaption}>La empresa se guarda en Supabase y se vincula a tu cuenta autenticada. Los módulos comerciales que aún usan almacenamiento local siguen compartidos en este navegador.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
