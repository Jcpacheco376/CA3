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
    esGeneral: boolean;
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
    EventoIcono?: string;
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

export interface EmployeeBirthday {
    EmpleadoId: number;
    Nombres: string;
    ApellidoPaterno: string;
    ApellidoMaterno: string;
    FechaNacimiento: string;
    DiaNacimiento: number;
    MesNacimiento: number;
}

export interface EmployeeAnniversary {
    EmpleadoId: number;
    Nombres: string;
    ApellidoPaterno: string;
    ApellidoMaterno: string;
    FechaIngreso: string;
    DiaAniversario: number;
    MesAniversario: number;
    AniosServicio: number;
}
