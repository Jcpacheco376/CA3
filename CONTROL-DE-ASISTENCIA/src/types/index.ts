// src/types/index.ts
export type View =
    'dashboard' |
    'attendance_weekly' |
    'attendance_reports' |
    'report_kardex' |
    'report_incidencias' |
    'employees' |
    'admin_users' |
    'admin_roles' |
    'admin_catalogs' |
    'admin_departamentos' |
    'admin_grupos_nomina' |
    'admin_puestos' |
    'admin_establecimientos' |
    'admin_estatus_asistencia' |
    'admin_horarios' |
    'schedule_planner';


export type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

export interface ActiveFilters {
    departamentos: boolean;
    gruposNomina: boolean;
    puestos: boolean;
    establecimientos: boolean;
}

// ... (El resto de las interfaces User, Role, etc., se mantienen sin cambios)
export interface User {
    UsuarioId: number;
    NombreUsuario: string;
    NombreCompleto: string;
    Email: string;
    EstaActivo: boolean;
    Roles: Role[];
    Departamentos?: { DepartamentoId: string, Nombre: string }[];
    GruposNomina?: { GrupoNominaId: string, Nombre: string }[];
    Puestos?: { PuestoId: number, Nombre: string }[];
    Establecimientos?: { EstablecimientoId: number, Nombre: string }[];
    permissions?: { [key: string]: string[] };
    Theme?: string;
    AnimationsEnabled?: boolean;
    DebeCambiarPassword?: boolean;

    //activeFilters?: ActiveFilters;
}
export interface Role {
    RoleId: number;
    NombreRol: string;
    Descripcion?: string;
    Permisos?: Permission[];
    EsPrincipal?: boolean;

}
export interface Permission {
    PermisoId: number;
    NombrePermiso: string;
    Descripcion?: string;
}
export interface Employee { id: string; name: string; department: string; scheduleId: string; }
export interface Schedule { id: string; name: string; restDays: DayOfWeek[]; }

export interface AttendanceStatus {
    EstatusId: number;
    Abreviatura: string;
    Descripcion: string;
    ColorUI: string;
    ValorNomina: number;
    VisibleSupervisor: boolean;
    Activo: boolean;
    tipoCalculoId: string; // 'ASISTENCIA', 'FALTA', etc. 
    DiasRegistroFuturo: number;
    PermiteComentario: boolean;
    ConceptoNominaId?: number | null;
}
export type AttendanceStatusCode = string;






