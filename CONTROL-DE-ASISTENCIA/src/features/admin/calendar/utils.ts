// src/features/admin/calendar/utils.ts
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { statusColorPalette } from '../../../config/theme';

export const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const DIMENSIONS = [
    { key: 'DEPARTAMENTO', label: 'Departamento', labelPlural: 'Departamentos', endpoint: '/catalogs/departamentos', idField: 'DepartamentoId', nameField: 'Nombre' },
    { key: 'GRUPO_NOMINA', label: 'Grupo de Nómina', labelPlural: 'Grupos de Nómina', endpoint: '/catalogs/grupos-nomina', idField: 'GrupoNominaId', nameField: 'Nombre' },
    { key: 'PUESTO', label: 'Puesto', labelPlural: 'Puestos', endpoint: '/catalogs/puestos', idField: 'PuestoId', nameField: 'Nombre' },
    { key: 'ESTABLECIMIENTO', label: 'Establecimiento', labelPlural: 'Establecimientos', endpoint: '/catalogs/establecimientos', idField: 'EstablecimientoId', nameField: 'Nombre' },
];

export const LOGICA_LABELS: Record<string, { label: string; description: string }> = {
    'OMISION_CHECADAS': { label: 'Omite checadas', description: 'No requiere checada de entrada/salida' },
    'IGNORAR_SALIDA': { label: 'Ignora salida', description: 'No marca como incompleta la jornada' },
    'IGNORAR_RETARDO': { label: 'Ignora retardo', description: 'No marca como retardo la entrada tardía' },
    'NINGUNO': { label: 'Informativo', description: 'Solo informativo, no afecta el cálculo' },
};

export const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseDateKey = (s: string) => { const [y, m, d] = s.split('T')[0].split('-').map(Number); return new Date(y, m - 1, d); };
export const getColor = (c: string) => statusColorPalette[c] || statusColorPalette.slate;

export const DynamicIcon = ({ name, size = 16, className = "", style }: { name?: string, size?: number, className?: string, style?: React.CSSProperties }) => {
    const Icon = name && (LucideIcons as any)[name] ? (LucideIcons as any)[name] : LucideIcons.Calendar;
    return React.createElement(Icon, { size, className, style });
};

export const SENTENCE_FLOW = [
    { dimKey: 'GRUPO_NOMINA', connector: 'Grupo Nómina', placeholder: 'Cualquier grupo' },
    { dimKey: 'ESTABLECIMIENTO', connector: 'Establecimiento', placeholder: 'Cualquier establecimiento' },
    { dimKey: 'DEPARTAMENTO', connector: 'Departamento', placeholder: 'Cualquier departamento' },
    { dimKey: 'PUESTO', connector: 'Puesto', placeholder: 'Cualquier puesto' },
];
