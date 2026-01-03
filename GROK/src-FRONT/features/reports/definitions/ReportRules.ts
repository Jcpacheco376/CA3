// src/features/reports/definitions/ReportRules.ts

export type RowStatus = 'complete' | 'pending_approval' | 'incident' | 'missing_data' | 'missing_schedule';

export interface ValidationResult {
    status: RowStatus;
    message: string;
    isReady: boolean;
}

export const ReportValidators = {
    
    kardex: (ficha: any): ValidationResult => {
        if (!ficha.Fecha) return { status: 'missing_data', message: 'Sin información', isReady: false };
        if (ficha.IncidenciaActivaId) return { status: 'incident', message: 'Discrepancia', isReady: true };
        if (!ficha.EstatusManualAbrev) return { status: 'pending_approval', message: 'Falta aprobación', isReady: false };
        return { status: 'complete', message: 'Validado', isReady: true };
    },

    // Reglas actualizadas para Lista de Asistencia
    attendanceList: (ficha: any): ValidationResult => {
        // 1. Validación de Horario (Prioridad Alta Operativa)
        if (!ficha.HorarioId) {
            return { status: 'missing_schedule', message: 'Sin turno asignado', isReady: false };
        }

        // 2. Validación de Datos
        const tieneEntrada = ficha.HoraEntrada && ficha.HoraEntrada !== '00:00';
        const tieneSalida = ficha.HoraSalida && ficha.HoraSalida !== '00:00';
        const tieneEstatusAuto = !!ficha.EstatusChecadorAbrev;
        
        if (!tieneEntrada && !tieneSalida && !tieneEstatusAuto) {
            return { status: 'missing_data', message: 'Ausente / Sin registro', isReady: false };
        }
        
        // Incidencias aquí son informativas
        if (ficha.IncidenciaActivaId) {
             return { status: 'incident', message: 'Incidencia', isReady: true };
        }

        return { status: 'complete', message: 'Operativo', isReady: true };
    }
};

export const getValidationColor = (status: RowStatus, theme: 'bg' | 'text' | 'border' = 'text') => {
    const colors = {
        complete: { text: 'text-slate-600', bg: 'bg-white', border: 'border-slate-200' },
        pending_approval: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        incident: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
        missing_data: { text: 'text-red-400', bg: 'bg-slate-50', border: 'border-dashed border-slate-300' },
        // Nuevo estilo para falta de horario (Gris oscuro / Alerta)
        missing_schedule: { text: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-300' } 
    };
    return colors[status][theme] || colors['complete'][theme];
};