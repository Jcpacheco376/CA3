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
    { dimKey: 'DEPARTAMENTO', connector: 'Departamento', placeholder: 'Cualquier departamento' },
    { dimKey: 'GRUPO_NOMINA', connector: 'Grupo Nómina', placeholder: 'Cualquier grupo' },
    { dimKey: 'PUESTO', connector: 'Puesto', placeholder: 'Cualquier puesto' },
    { dimKey: 'ESTABLECIMIENTO', connector: 'Establecimiento', placeholder: 'Cualquier establecimiento' },
];

export const getSmartEventIcon = (eventName: string, defaultIcon: string): string => {
    const text = eventName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ""); // remove accents

    if (text.includes('navidad') || text.includes('nochebuena')) return 'TreePine';
    if (text.includes('año nuevo') || text.includes('ano nuevo')) return 'PartyPopper';
    if (text.includes('independencia') || text.includes('bandera') || text.includes('patria')) return 'Flag';
    if (text.includes('muertos') || text.includes('halloween')) return 'Skull';
    if (text.includes('madre') || text.includes('padre') || text.includes('amor')) return 'Heart';
    if (text.includes('trabajo') || text.includes('trabajador')) return 'HardHat';
    if (text.includes('revolucion')) return 'Swords';
    if (text.includes('natalicio') || text.includes('nacimiento') || text.includes('cumpleanos') || text.includes('cumpleaños')) return 'Cake';
    if (text.includes('primavera')) return 'Flower2';
    if (text.includes('constitucion') || text.includes('ley')) return 'Scale';
    if (text.includes('maestro') || text.includes('profesor') || text.includes('clase')) return 'GraduationCap';
    if (text.includes('mujer') || text.includes('nino') || text.includes('niño')) return 'UserRound';

    return defaultIcon;
};
