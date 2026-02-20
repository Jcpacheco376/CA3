// src/features/admin/calendar/types.ts

export interface EventType {
    TipoEventoId: string;
    Nombre: string;
    Descripcion: string;
    LogicaCalculo: string;
    EstatusAsistenciaId: number | null;
    EstatusNombre: string | null;
    PermiteMultiplesMismoDia: boolean;
    PermiteMultiplesAnio: boolean;
    ColorUI: string;
    Icono: string;
    EsSistema: boolean;
    Activo: boolean;
}

export interface EventFilter {
    filtroId: number;
    grupoRegla: number;
    dimension: string;
    valorId: number;
    valorNombre: string;
}

export interface CalendarEvent {
    EventoId: number;
    Fecha: string;
    Nombre: string;
    Descripcion: string;
    TipoEventoId: string;
    TipoEventoNombre: string;
    LogicaCalculo: string;
    TipoColorUI: string;
    TipoIcono: string;
    AplicaATodos: boolean;
    Activo: boolean;
    Filtros: EventFilter[];
}

export interface CatalogItem {
    id: number;
    nombre: string;
}

export interface DimensionFilter {
    dimension: string;
    valores: number[];
}

export interface FilterGroup {
    id: string; // unique ID for React keys
    filters: DimensionFilter[];
}
