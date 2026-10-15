import { isValidEmail } from './authValidation';
import { supabase } from '../../lib/supabase';

export type CompanyData = {
  ruc: string;
  legalName: string;
  fiscalAddress: string;
  tradeName: string;
  phone: string;
  email: string;
};
export type CompanyErrors = Partial<Record<keyof CompanyData, string>>;
export type CompanyReadResult = { company: CompanyData | null; error: string | null };
export const COMPANY_TABLE = 'erp_senatinos_companies';
const companyColumns = 'user_id,ruc,legal_name,fiscal_address,trade_name,phone,email';

export function normalizeCompany(company: CompanyData): CompanyData {
  return {
    ruc: company.ruc.trim(),
    legalName: company.legalName.trim(),
    fiscalAddress: company.fiscalAddress.trim(),
    tradeName: company.tradeName.trim(),
    phone: company.phone.trim(),
    email: company.email.trim(),
  };
}

export function validateCompany(company: CompanyData): CompanyErrors {
  const errors: CompanyErrors = {};
  if (!/^\d{11}$/.test(company.ruc)) errors.ruc = 'El RUC debe contener exactamente 11 dígitos.';
  if (!company.legalName.trim()) errors.legalName = 'Ingresa la razón social.';
  if (!company.fiscalAddress.trim()) errors.fiscalAddress = 'Ingresa la dirección fiscal.';
  if (company.email && !isValidEmail(company.email)) errors.email = 'Ingresa un correo de empresa válido.';
  if (company.legalName.length > 250) errors.legalName = 'La razón social admite hasta 250 caracteres.';
  if (company.fiscalAddress.length > 1000) errors.fiscalAddress = 'La dirección fiscal admite hasta 1000 caracteres.';
  if (company.tradeName.length > 250) errors.tradeName = 'El nombre comercial admite hasta 250 caracteres.';
  if (company.phone.length > 50) errors.phone = 'El teléfono admite hasta 50 caracteres.';
  if (company.email.length > 254) errors.email = 'El correo admite hasta 254 caracteres.';
  return errors;
}

/** Contract for the proposed migration; no existing schema is assumed. */
export async function readCompany(userId: string): Promise<CompanyReadResult> {
  try {
    if (!supabase) throw new Error('Missing client');
    const { data, error } = await supabase.from(COMPANY_TABLE).select(companyColumns).eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (!data) return { company: null, error: null };
    if (data.user_id !== userId || (['ruc', 'legal_name', 'fiscal_address', 'trade_name', 'phone', 'email'] as const).some(field => typeof data[field] !== 'string')) throw new Error('Invalid company');
    const company = normalizeCompany({ ruc: data.ruc, legalName: data.legal_name, fiscalAddress: data.fiscal_address, tradeName: data.trade_name, phone: data.phone, email: data.email });
    if (Object.keys(validateCompany(company)).length) throw new Error('Invalid company fields');
    return { company, error: null };
  } catch {
    return { company: null, error: 'No se pudo consultar tu empresa en Supabase. Revisa la migración, las políticas y la conexión; no se habilitará el dashboard hasta completar esta consulta.' };
  }
}

export async function saveCompany(userId: string, company: CompanyData): Promise<string | null> {
  const normalizedCompany = normalizeCompany(company);
  if (Object.keys(validateCompany(normalizedCompany)).length) return 'Revisa los datos de la empresa antes de continuar.';
  try {
    if (!supabase) throw new Error('Missing client');
    // The server sets user_id = auth.uid(); no user-selected owner is inserted.
    const { data, error } = await supabase.from(COMPANY_TABLE).insert({
      ruc: normalizedCompany.ruc, legal_name: normalizedCompany.legalName,
      fiscal_address: normalizedCompany.fiscalAddress, trade_name: normalizedCompany.tradeName,
      phone: normalizedCompany.phone, email: normalizedCompany.email,
    }).select('user_id').single();
    if (error?.code === '23505') return 'Tu cuenta ya tiene una empresa registrada. Recarga la página para consultarla.';
    if (error || data?.user_id !== userId) throw new Error('Company save failed');
    return null;
  } catch {
    return 'No se pudo guardar la empresa en Supabase. Tus campos se mantienen; revisa la conexión y la configuración de la base de datos e inténtalo de nuevo.';
  }
}
