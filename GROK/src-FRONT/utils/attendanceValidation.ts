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
