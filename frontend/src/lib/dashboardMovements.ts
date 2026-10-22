export interface DashboardMovement {
  id: string;
  timestamp: string;
  fecha: string;
  descripcion: string;
  tipo: 'ingreso' | 'salida';
  monto: number;
}

const DASHBOARD_MOVEMENTS_KEY = 'erp_dashboard_movements';

export const recordDashboardMovement = (movement: DashboardMovement): void => {
  const cached = localStorage.getItem(DASHBOARD_MOVEMENTS_KEY);
  const movements: DashboardMovement[] = cached ? JSON.parse(cached) : [];
  const updated = [
    movement,
    ...movements.filter(existing => existing.id !== movement.id)
  ].slice(0, 50);

  localStorage.setItem(DASHBOARD_MOVEMENTS_KEY, JSON.stringify(updated));
};

export const getRecordedDashboardMovements = (): DashboardMovement[] => {
  const cached = localStorage.getItem(DASHBOARD_MOVEMENTS_KEY);
  return cached ? JSON.parse(cached) : [];
};
