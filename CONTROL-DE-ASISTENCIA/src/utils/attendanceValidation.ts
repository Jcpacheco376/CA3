// src/utils/attendanceValidation.ts
import { AttendanceStatus } from '../types';

/**
 * Calcula si un estatus puede asignarse a una fecha específica
 * basándose en el campo DiasRegistroFuturo.
 * 
 * @param status - Configuración del estatus de asistencia
 * @param targetDate - Fecha a la que se intenta asignar el estatus
 * @param currentDate - Fecha de referencia (por defecto, hoy)
 * @returns true si el estatus puede asignarse, false en caso contrario
 */
export const canAssignStatusToDate = (
  status: AttendanceStatus,
  targetDate: Date,
  currentDate: Date = new Date()
): boolean => {
  // Normalizamos ambas fechas a medianoche para comparación correcta
  const normalizedTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const normalizedCurrent = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  const diffInMs = normalizedTarget.getTime() - normalizedCurrent.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  return diffInDays <= status.DiasRegistroFuturo;
};

/**
 * Obtiene un mensaje descriptivo sobre por cuántos días no se puede asignar un estatus
 * 
 * @param status - Configuración del estatus de asistencia
 * @param targetDate - Fecha a la que se intenta asignar el estatus
 * @param currentDate - Fecha de referencia (por defecto, hoy)
 * @returns Mensaje descriptivo o vacío si sí se puede asignar
 */
export const getRestrictionMessage = (
  status: AttendanceStatus,
  targetDate: Date,
  currentDate: Date = new Date()
): string => {
  if (canAssignStatusToDate(status, targetDate, currentDate)) {
    return '';
  }

  const normalizedTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const normalizedCurrent = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  const diffInMs = normalizedTarget.getTime() - normalizedCurrent.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  if (status.DiasRegistroFuturo === 0) {
    return `No se puede asignar para fechas futuras`;
  }

  return `Solo se permite asignar hasta ${status.DiasRegistroFuturo} días adelante`;
};

/**
 * Parsea una fecha en formato YYYY-MM-DD a un objeto Date local
 * (evitando el desfase de zona horaria de UTC).
 */
export const parseLocal = (dateStr: string): Date => {
  const p = dateStr.substring(0, 10).split('-');
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
};

/**
 * Verifica si una fecha específica está dentro del rango de empleo.
 */
export const isDateWithinEmploymentRange = (
  targetDate: Date,
  fechaIngreso?: string | null,
  fechaBaja?: string | null
): boolean => {
  const normalizedTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  if (fechaIngreso) {
    const normalizedIng = parseLocal(fechaIngreso);
    if (normalizedTarget < normalizedIng) return false;
  }

  if (fechaBaja) {
    const normalizedBaj = parseLocal(fechaBaja);
    if (normalizedTarget > normalizedBaj) return false;
  }

  return true;
};
