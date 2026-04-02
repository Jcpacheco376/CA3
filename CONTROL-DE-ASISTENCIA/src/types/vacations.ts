// src/types/vacations.ts
// Tipos compartidos del módulo de vacaciones

export type VacationMode = 'FIN' | 'DEV' | 'INI';

export interface VacationDetailModalState {
    year: number;
    data: any;
    employeeName?: string;
    period?: string;
    saldoId?: number;
    endDate?: string;
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
    // Forzar medio día local para evitar que saltos de zona horaria o DST cambien el día
    return new Date(year, month - 1, day, 12, 0, 0);
};

export const getAvailableVacationDays = (emp: any, mode: VacationMode): number => {
    if (!emp.VacacionesSummary) return 0;

    let summary: any = {};
    try {
        summary = typeof emp.VacacionesSummary === 'string'
            ? JSON.parse(emp.VacacionesSummary)
            : emp.VacacionesSummary;
    } catch (e) { return 0; }

    const { TotalOtorgados, TotalConsumidos, OtorgadosActual, IniActual, FinActual } = summary;

    // Si no hay periodo actual detectado, devolvemos el saldo histórico
    if (!OtorgadosActual || !IniActual) return (TotalOtorgados || 0) - (TotalConsumidos || 0);

    let earnedActual = 0;
    const start = parseSQLDate(IniActual);
    const end = parseSQLDate(FinActual);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (start && end) {
        if (today >= start) {
            if (today >= end) {
                earnedActual = OtorgadosActual;
            } else {
                if (mode === 'INI') {
                    earnedActual = OtorgadosActual;
                } else if (mode === 'FIN') {
                    earnedActual = 0;
                } else if (mode === 'DEV') {
                    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (86400000) + 1);
                    const elapsedDays = Math.max(1, (today.getTime() - start.getTime()) / (86400000) + 1);
                    earnedActual = OtorgadosActual * (Math.min(1, elapsedDays / totalDays));
                }
            }
        }
    }

    // El saldo disponible es: (Lo ganado en años anteriores) + (Lo ganado proporcionalmente este año) - (Todo lo consumido)
    const result = ((TotalOtorgados || 0) - (OtorgadosActual || 0)) + earnedActual - (TotalConsumidos || 0);
    return result;
};
