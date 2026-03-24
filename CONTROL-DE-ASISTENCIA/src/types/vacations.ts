// src/types/vacations.ts
// Tipos compartidos del módulo de vacaciones

export type VacationMode = 'FIN' | 'DEV' | 'INI';

export interface VacationDetailModalState {
    year: number;
    data: any;
    employeeName?: string;
    period?: string;
}

export interface AdjustmentModalState {
    saldoId: number;
    year: number;
}

export interface ExtraordinaryModalState {
    saldoId: number;
    currentValue: number;
    detalleId?: number | null;
}

// Ayuda a procesar fechas de SQL (YYYY-MM-DD) de forma local para evitar desfases de zona horaria
export const parseSQLDate = (dateStr: any): Date | null => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const s = dateStr.toString().includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = s.split('-');
    if (parts.length !== 3) return new Date(dateStr);
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
};
