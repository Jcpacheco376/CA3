// src/types/payroll.ts

export interface PeriodSummary {
    TotalFichas: number;
    ListasParaCierre: number;
    PendientesIncidencia: number;
    PendientesValidacion: number;
    YaBloqueadas: number;
}

export interface PeriodException {
    EmpleadoId: number;
    NombreCompleto: string;
    Fecha: string; // ISO Date
    Estado: string;
    MotivoRechazo: string;
}

export interface PreviewResponse {
    summary: PeriodSummary;
    exceptions: PeriodException[];
}

export interface CloseResponse {
    message: string;
    data: {
        FichasBloqueadas: number;
        FichasPendientes: number;
        EstatusFinal: 'COMPLETO' | 'PARCIAL';
    };
}