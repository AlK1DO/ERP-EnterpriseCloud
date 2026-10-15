import { Building2 } from 'lucide-react';
import styles from './LoginPage.module.css';

export function BrandPanel() {
  return (
    <aside className={styles.brand} aria-label="ERP Senatinos">
      <div className={styles.geometry} aria-hidden="true" />
      <div className={styles.brandIdentity}>
        <span className={styles.brandMark}><Building2 size={25} aria-hidden="true" /></span>
        <span className={styles.brandName}>ERP <span className={styles.brandNameAccent}>Senatinos</span></span>
      </div>
      <div className={styles.brandMessage}>
        <span className={styles.eyebrow}>GESTIÓN EMPRESARIAL</span>
        <h2 className={styles.brandTitle}>La gestión de tu empresa, <span>en un solo lugar</span></h2>
        <p className={styles.brandDescription}>Un espacio para organizar tus operaciones y mantener el enfoque en lo que hace crecer tu empresa.</p>
        <div className={styles.brandDivider} aria-hidden="true" />
        <p className={styles.brandCaption}>Conecta tu equipo. Simplifica tu día.</p>
      </div>
      <span className={styles.brandFooter}>ERP Senatinos · Gestión integral</span>
    </aside>
  );
}
