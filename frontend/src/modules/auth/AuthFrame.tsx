import type { ReactNode } from 'react';
import { BrandPanel } from './BrandPanel';
import styles from './LoginPage.module.css';

export function AuthFrame({ title, description, icon, children }: { title: string; description: string; icon: ReactNode; children: ReactNode }) {
  return <main className={styles.page} lang="es"><div className={styles.card}><BrandPanel /><section className={styles.formPanel} aria-labelledby="auth-frame-title"><div className={styles.formContent}><header className={styles.formHeading}><span className={styles.accessIcon}>{icon}</span><h1 className={styles.title} id="auth-frame-title">{title}</h1><p className={styles.description}>{description}</p></header>{children}</div></section></div></main>;
}
