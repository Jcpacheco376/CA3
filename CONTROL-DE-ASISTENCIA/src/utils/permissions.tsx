// src/utils/permissions.tsx
import React from 'react';
import { Permission } from '../types';
// --- MODIFICACIÓN: Importamos todos los íconos necesarios ---
import { 
    Users, Settings, FileText, Folder, PlusCircle, Pencil, Trash, Eye, 
    Check, CalendarClock, Building, Clock, Briefcase, Tag, MapPin, Lock,Unlock
} from 'lucide-react';

// --- MODIFICACIÓN: Etiquetas de Recurso actualizadas ---
const resourceLabels: { [key: string]: string } = {
    usuarios: 'Gestión de Usuarios',
    roles: 'Gestión de Roles',
    reportesAsistencia: 'Reportes de Asistencia',
    horarios: 'Programador de Horarios',
    'catalogo.departamentos': 'Catálogo: Departamentos',
    'catalogo.gruposNomina': 'Catálogo: Grupos de Nómina',
    'catalogo.estatusAsistencia': 'Catálogo: Estatus de Asistencia',
    'catalogo.horarios': 'Catálogo: Horarios',
    'catalogo.puestos': 'Catálogo: Puestos',
    'catalogo.establecimientos': 'Catálogo: Establecimientos',
    'nomina': 'Gestión de Nómina',
};

// --- MODIFICACIÓN: Etiquetas de Acción actualizadas a tu DB ---
const actionLabels: { [key: string]: string } = {
    'create': 'Crear',
    'read': 'Ver',
    'update': 'Modificar', // (usado por 'usuarios')
    'delete': 'Eliminar',
    'assign': 'Asignar / Modificar', // (usado por 'horarios' y 'reportesAsistencia')
    'approve': 'Aprobar',
    'manage': 'Administrar',
    'unlock': 'Desbloquear Periodos'
};

// --- MODIFICACIÓN: Iconos de Recurso (para el modal de roles) ---
export const permissionIcons: { [key: string]: JSX.Element } = {
    usuarios: <Users size={18} />,
    roles: <Settings size={18} />,
    reportesAsistencia: <FileText size={18} />,
    horarios: <CalendarClock size={18} />,
    'catalogo.departamentos': <Building size={18} />,
    'catalogo.gruposNomina': <Briefcase size={18} />,
    'catalogo.estatusAsistencia': <Check size={18} />,
    'catalogo.horarios': <Clock size={18} />,
    'catalogo.puestos': <Tag size={18} />,
    'catalogo.establecimientos': <MapPin size={18} />,
    'nomina': <Lock size={18} />, 
    'default': <Folder size={18} />
};

// --- MODIFICACIÓN: Iconos de Acción actualizados ---
export const actionIcons: { [key: string]: JSX.Element } = {
    'create': <PlusCircle size={16} />,
    'read': <Eye size={16} />,
    'update': <Pencil size={16} />,
    'delete': <Trash size={16} />,
    'assign': <Pencil size={16}/>, 
    'approve': <Check size={16}/>,
    'manage': <Settings size={16} />,
    'unlock': <Unlock size={16} />, 
    'default': <Check size={16} />
};

const getParts = (permissionName: string) => {
    const parts = permissionName.split('.');
    let resource = parts[0]; // Ej: 'reportesAsistencia', 'horarios', 'catalogo'
    let action = parts.slice(1).join('.'); // Ej: 'read', 'assign', 'departamentos.read'

    // Si es un catálogo, el recurso son las dos primeras partes
    if (resource === 'catalogo' && parts.length > 2) {
        resource = `${parts[0]}.${parts[1]}`; // Ej: 'catalogo.puestos'
        action = parts.slice(2).join('.'); // Ej: 'read', 'manage'
    } else if (resource === 'catalogo' && parts.length <= 2) {
        // Caso base para 'catalogo' (si existiera un permiso 'catalogo.read' general)
        action = parts.slice(1).join('.');
    }

    return { resource, action };
};


export const getFullPermissionTranslation = (permissionName: string): string => {
    const { resource, action } = getParts(permissionName);
    const translatedResource = resourceLabels[resource] || resource;
    const translatedAction = actionLabels[action] || action;
    return `${translatedResource}: ${translatedAction}`;
};

export const getActionTranslation = (permissionName: string): string => {
    const { action } = getParts(permissionName);
    return actionLabels[action] || action;
};

export const setupPermissions = (permissions: Permission[]) => {
    const groups: { [key: string]: { label: string; permissions: Permission[], icon?: JSX.Element } } = {};
    const dependencies: { [key: string]: string } = {};

    permissions.forEach(p => {
        const { resource, action } = getParts(p.NombrePermiso);
        const groupKey = resource;

        if (!groups[groupKey]) {
            groups[groupKey] = {
                label: resourceLabels[groupKey] || groupKey,
                permissions: [],
                icon: permissionIcons[groupKey] || permissionIcons['default']
            };
        }
        groups[groupKey].permissions.push(p);

        // 'update', 'approve', 'assign', 'delete', 'manage' dependen de 'read'
        if (action !== 'read' && action !== 'create') {
            const readPermissionName = `${resource}.read`;
            const readPermission = permissions.find(pr => pr.NombrePermiso === readPermissionName);
            if (readPermission) {
                dependencies[p.NombrePermiso] = readPermission.NombrePermiso;
            }
        }
        
    });

    return { groups, dependencies };
};

// // src/utils/permissions.tsx
// import React from 'react';
// import { Permission } from '../types';
// import { Users, Settings, FileText, Folder, PlusCircle, Pencil, Trash, Eye, Check, CalendarClock, Building, Clock } from 'lucide-react';

// // --- MAPAS CENTRALIZADOS PARA TRADUCCIONES Y CONFIGURACIÓN ---

// const resourceLabels: { [key: string]: string } = {
//     usuarios: 'Gestión de Usuarios',
//     roles: 'Gestión de Roles',
//     reportesAsistencia: 'Reportes de Asistencia',
//     horarios: 'Programador de Horarios',
//     'catalogo.departamentos': 'Catálogo: Departamentos',
//     'catalogo.gruposNomina': 'Catálogo: Grupos de Nómina',
//     'catalogo.estatusAsistencia': 'Catálogo: Estatus de Asistencia',
//     'catalogo.horarios': 'Catálogo: Horarios',
// };

// const actionLabels: { [key: string]: string } = {
//     create: 'Crear',
//     read: 'Ver',
//     update: 'Modificar',
//     delete: 'Eliminar',
//     assign: 'Asignar',
//     approve: 'Aprobar',
//     manage: 'Administrar'
// };

// export const permissionIcons: { [key: string]: JSX.Element } = {
//     usuarios: <Users size={20} className="text-blue-500"/>,
//     roles: <Settings size={20} className="text-purple-500"/>,
//     reportesAsistencia: <FileText size={20} className="text-green-500"/>,
//     horarios: <CalendarClock size={20} className="text-teal-500"/>,
//     catalogo: <Folder size={20} className="text-orange-500"/>,
// };

// export const actionIcons: { [key: string]: JSX.Element } = {
//     create: <PlusCircle size={16} />,
//     read: <Eye size={16} />,
//     update: <Pencil size={16} />,
//     delete: <Trash size={16} />,
//     assign: <Users size={16}/>,
//     approve: <Check size={16}/>,
//     manage: <Settings size={16} />
// };

// const getParts = (permissionName: string) => {
//     const parts = permissionName.split('.');
//     const action = parts.pop() || '';
//     const resource = parts.join('.');
//     return { resource, action };
// };

// export const getFullPermissionTranslation = (permissionName: string): string => {
//     const { resource, action } = getParts(permissionName);
//     const translatedResource = resourceLabels[resource] || resource;
//     const translatedAction = actionLabels[action] || action;
//     return `${translatedResource}: ${translatedAction}`;
// };

// export const getActionTranslation = (permissionName: string): string => {
//     const { action } = getParts(permissionName);
//     return actionLabels[action] || action;
// };

// export const setupPermissions = (permissions: Permission[]) => {
//     const groups: { [key: string]: { label: string; permissions: Permission[], icon?: JSX.Element } } = {};
//     const dependencies: { [key: string]: string } = {};

//     permissions.forEach(p => {
//         const { resource, action } = getParts(p.NombrePermiso);
        
//         // --- MODIFICACIÓN: Cambiamos la lógica de agrupación ---
//         // Ya no agrupamos todo 'catalogo' en uno solo.
//         // let groupKey = resource;
//         // let mainResource = resource.split('.')[0];
//         // if (mainResource === 'catalogo') {
//         //     groupKey = 'catalogo';
//         // }
//         // --- FIN MODIFICACIÓN ---

//         const groupKey = resource; // <-- La clave ahora es el recurso completo (ej: 'catalogo.puestos')

//         if (!groups[groupKey]) {
//             groups[groupKey] = {
//                 label: resourceLabels[groupKey] || groupKey,
//                 permissions: [],
//                 icon: permissionIcons[groupKey] // Usará el ícono específico
//             };
//         }
//         groups[groupKey].permissions.push(p);

//         if (action !== 'read' && action !== 'create') {
//             const readPermissionName = `${resource}.read`;
//             const readPermission = permissions.find(pr => pr.NombrePermiso === readPermissionName);
//             if (readPermission) {
//                 dependencies[p.NombrePermiso] = readPermission.NombrePermiso;
//             }
//         }
//     });

//     return { groups, dependencies };
// };
