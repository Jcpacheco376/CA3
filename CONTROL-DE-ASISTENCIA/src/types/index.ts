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
    'admin_empleados' |
    'admin_devices' |
    'schedule_planner' |
    'devices' |
    'report_prenomina' |
    'report_attendance_list' |
    'payroll_closing' |
    'admin_calendar_events' |
    'vacations';


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
    EmpleadoId?: number | null;
    NombreUsuario: string;
    NombreCompleto: string;
    Email: string;
    Telefono?: string;
    EstaActivo: boolean;
    Roles: Role[];
    Departamentos?: ({ DepartamentoId: string, Nombre: string } | string)[];
    GruposNomina?: ({ GrupoNominaId: string, Nombre: string, Periodo?: string } | string)[];
    Puestos?: ({ PuestoId: number, Nombre: string } | number)[];
    Establecimientos?: ({ EstablecimientoId: number, Nombre: string } | number)[];
    permissions?: { [key: string]: string[] };
    Theme?: string;
    DebeCambiarPassword?: boolean;

    activeFilters?: ActiveFilters;
}
export interface Role {
    RoleId: number;
    NombreRol: string;
    Descripcion?: string;
    SISPermisos?: Permission[];
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


export interface Device {
    DispositivoId: number;
    Nombre: string;
    IpAddress: string;
    Puerto: number;
    ZonaId: number;
    ZonaNombre?: string;
    TipoConexion: 'SDK' | 'ADMS';
    Estado: 'Conectado' | 'Desconectado' | 'Error';
    UltimaSincronizacion?: string;
    PasswordCom?: string;
}

export interface Zone {
    ZonaId: number;
    Nombre: string;
}



export interface EmployeeStats {
    TotalActivos: number;
    SinHorario: number;
    HorarioRotativo: number;
    SinDispositivo: number;
    SinFoto?: number;
    TotalInactivos?: number;
}
