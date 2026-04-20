import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfDay, addDays, isAfter, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import * as LucideIcons from 'lucide-react';
import {
    User, AlertTriangle, MapPin, Info,
    Loader2, AlertCircle, FileText, ChevronLeft, ChevronRight,
    MapPinned, Clock, CalendarDays, X, Coffee, CalendarOff, ScanSearch,
    Star, PartyPopper, Gift, Bell, ArrowUpCircle, ArrowDownCircle, RefreshCw, Wand2, TimerReset
} from 'lucide-react';
import { Modal, Button } from '../../components/ui/Modal';
import { Tooltip } from '../../components/ui/Tooltip';
import { API_BASE_URL } from '../../config/api';
import { statusColorPalette } from '../../config/theme';
import { CalendarEventTag, CalendarEventList } from '../../components/CalendarEventTag';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../auth/AuthContext';

interface AuditTimelineModalProps {
    employeeId: number;
    employeeName: string;
    employeeFicha: string;
    startDate: Date;
    endDate: Date;
    onClose: () => void;
    getToken: () => string | null;
    statusCatalog?: any[]; // Prop crucial para no harcodear nombres
    scheduleCatalog?: any[]; // <--- NUEVA PROP para enriquecimiento
    /** Callback opcional que se invoca al terminar una regeneración exitosa */
    onRegenerated?: (employeeId: number, startDate: Date, endDate: Date) => void;
}

const getColorClasses = (colorName: string = 'slate') => {
    const palette = statusColorPalette[colorName] || statusColorPalette.slate;
    return {
        bg: palette.bgText,
        border: palette.border,
        light: palette.lightBorder,
        pastel: palette.pastel,
        text: palette.main.replace('bg-', 'text-')
    };
};

// getIcon se movió a su propio componente CalendarEventTag.tsx
const timeToPercent = (timeStr: string, addMinutes: number = 0) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + addMinutes;
    return (totalMinutes / (24 * 60)) * 100;
};

const calculateScheduledHours = (turno: any) => {
    if (!turno || !turno.HoraEntrada || !turno.HoraSalida) return 0;
    try {
        const [hE, mE] = turno.HoraEntrada.split(':').map(Number);
        const [hS, mS] = turno.HoraSalida.split(':').map(Number);
        let startMin = hE * 60 + mE;
        let endMin = hS * 60 + mS;

        if (endMin <= startMin) endMin += 1440; // Turno nocturno
        let duration = endMin - startMin;

        // Comida
        const hIni = turno.HoraInicioComida || turno.horaInicioComida || turno.HoraComidaInicio;
        const hFin = turno.HoraFinComida || turno.horaFinComida || turno.HoraComidaFin;
        const hasMeal = !!(turno.TieneComida || turno.tieneComida || (hIni && hIni !== '00:00:00' && hIni !== '00:00'));

        if (hasMeal && hIni && hFin) {
            const [hCi, mCi] = hIni.split(':').map(Number);
            const [hCf, mCf] = hFin.split(':').map(Number);
            let cStartMin = hCi * 60 + mCi;
            let cEndMin = hCf * 60 + mCf;

            // Ajuste nocturno para la comida
            if (endMin > 1440 && cStartMin < startMin) {
                cStartMin += 1440;
                cEndMin += 1440;
            }
            if (cEndMin < cStartMin) cEndMin += 1440;

            if (cStartMin >= startMin && cEndMin <= endMin) {
                duration -= (cEndMin - cStartMin);
            }
        }
        return Math.max(0, duration / 60);
    } catch { return 0; }
};

const calculateWorkedHours = (turno: any, dayChecadas: any[]) => {
    if (!turno || !turno.HoraEntrada || !turno.HoraSalida) return 0;
    try {
        const [hE, mE] = turno.HoraEntrada.split(':').map(Number);
        const [hS, mS] = turno.HoraSalida.split(':').map(Number);
        let entProg = hE * 60 + mE;
        let salProg = hS * 60 + mS;
        if (salProg <= entProg) salProg += 1440;

        const minAntes = turno.MinutosAntesEntrada || 0;
        const minDespues = turno.MinutosDespuesSalida || 0;

        const winStart = entProg - minAntes;
        const winEnd = salProg + minDespues;

        const checadasEnTurno = dayChecadas.filter(c => {
            if (!c.timePart) return false;
            const [h, m] = c.timePart.split(':').map(Number);
            let checkMin = h * 60 + m;
            if (salProg > 1440 && checkMin < (entProg - 120)) checkMin += 1440;
            return checkMin >= winStart && checkMin <= winEnd;
        }).map(c => {
            const [h, m] = c.timePart.split(':').map(Number);
            let checkMin = h * 60 + m;
            if (salProg > 1440 && checkMin < (entProg - 120)) checkMin += 1440;
            return checkMin;
        });

        if (checadasEnTurno.length < 2) return 0;

        const realEnt = Math.min(...checadasEnTurno);
        const realSal = Math.max(...checadasEnTurno);
        let duration = realSal - realEnt;

        // Restar comida
        const hIni = turno.HoraInicioComida || turno.horaInicioComida || turno.HoraComidaInicio;
        const hFin = turno.HoraFinComida || turno.horaFinComida || turno.HoraComidaFin;
        const hasMeal = !!(turno.TieneComida || turno.tieneComida || (hIni && hIni !== '00:00:00' && hIni !== '00:00'));

        if (hasMeal && hIni && hFin) {
            const [hCi, mCi] = hIni.split(':').map(Number);
            const [hCf, mCf] = hFin.split(':').map(Number);
            let cStartMin = hCi * 60 + mCi;
            let cEndMin = hCf * 60 + mCf;
            if (salProg > 1440 && cStartMin < entProg) {
                cStartMin += 1440;
                cEndMin += 1440;
            }
            if (cEndMin < cStartMin) cEndMin += 1440;
            // Solo descontar si el periodo de comida está entre la entrada y salida real detectada
            if (cStartMin >= realEnt && cEndMin <= realSal) {
                duration -= (cEndMin - cStartMin);
            }
        }
        return Math.max(0, duration / 60);
    } catch { return 0; }
};

export const AuditTimelineModal: React.FC<AuditTimelineModalProps> = ({
    employeeId, employeeName, employeeFicha, startDate, endDate, onClose, getToken, statusCatalog = [], scheduleCatalog = [], onRegenerated
}) => {
    const { can } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rawChecadas, setRawChecadas] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [fichas, setFichas] = useState<any[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    const [activeChecadaId, setActiveChecadaId] = useState<number | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    // date: día específico a regenerar (si aplica); manualDays: fechas con ajuste manual; validadoDays: fechas en VALIDADO sin manual
    const [confirmRegenerate, setConfirmRegenerate] = useState<{ isOpen: boolean; date?: string; manualDays?: string[]; validadoDays?: string[] }>({ isOpen: false });

    const { addNotification } = useNotification();

    const fetchData = useCallback(async () => {
        const token = getToken();
        if (!token) {
            setError("Error de autenticación: No se pudo obtener el token.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/attendance/raw-checadas`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empleadoId: employeeId,
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    endDate: format(endDate, 'yyyy-MM-dd')
                })
            });

            if (!res.ok) throw new Error(`Error API (${res.status}): ${res.statusText}`);

            const data = await res.json();
            setRawChecadas(data.checadas || []);
            setSchedules(data.schedules || []);
            setFichas(data.fichas || []);

            // Si el backend no devuelve los eventos en este endpoint, los buscamos por fuera
            const eventsFromAPI = data.events || data.eventos || data.calendar || data.calendarEvents;
            if (eventsFromAPI) {
                setCalendarEvents(eventsFromAPI);
            } else {
                const evRes = await fetch(`${API_BASE_URL}/calendar-events`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (evRes.ok) setCalendarEvents(await evRes.json());
            }

        } catch (err: any) {
            setError(err.message || "Ocurrió un error inesperado");
        } finally {
            setIsLoading(false);
        }
    }, [employeeId, startDate, endDate, getToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /**
     * Determina qué días dentro del rango tienen ajuste manual O están en estado VALIDADO.
     * Ambos tipos necesitan ser limpiados antes de que el SP pueda re-procesar la ficha.
     */
    const getDaysToResetInRange = (specificDateStr?: string): { manual: string[]; validado: string[] } => {
        const manual: string[] = [];
        const validado: string[] = [];
        fichas.forEach(f => {
            const fichaDate = f.Fecha?.substring(0, 10);
            if (!fichaDate) return;
            if (specificDateStr && fichaDate !== specificDateStr) return;
            if (!specificDateStr && (fichaDate < format(startDate, 'yyyy-MM-dd') || fichaDate > format(endDate, 'yyyy-MM-dd'))) return;

            if (f.EstatusManualAbrev) manual.push(fichaDate);
            if ((f.Estado || f.estado) === 'VALIDADO') validado.push(fichaDate);
        });
        return { manual, validado };
    };
    // Alias para la llamada existente de manualDays en confirmRegenerate
    const getManualDaysInRange = (specificDateStr?: string): string[] =>
        getDaysToResetInRange(specificDateStr).manual;

    /** Paso 1: El usuario pide regenerar — detectar manuales/validados y pedir confirmación */
    const requestRegenerate = (specificDateStr?: string) => {
        const { manual: manualDays, validado: validadoDays } = getDaysToResetInRange(specificDateStr);
        setConfirmRegenerate({ isOpen: true, date: specificDateStr, manualDays, validadoDays });
    };

    /** Paso 2: El usuario confirma — limpiar manuales y validados si los hay, luego regenerar */
    const handleRegenerate = async () => {
        const { date: specificDateStr, manualDays = [], validadoDays = [] } = confirmRegenerate;
        const token = getToken();
        if (!token) return;

        setIsRegenerating(true);
        setConfirmRegenerate({ isOpen: false });

        try {
            // --- PASO A: Limpiar todas las fichas que bloquean el re-proceso ---
            // Incluye: días con ajuste manual (EstatusManualAbrev) Y días en VALIDADO sin manual
            // Ambos tipos quedan en BORRADOR tras el SaveManual con estatusManual=null
            const allDaysToReset = Array.from(new Set([...manualDays, ...validadoDays]));
            if (allDaysToReset.length > 0) {
                const clearRequests = allDaysToReset.map(dateStr =>
                    fetch(`${API_BASE_URL}/attendance`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            empleadoId: employeeId,
                            fecha: dateStr,
                            estatusManual: null,  // null = limpiar / volver a BORRADOR
                            comentarios: null
                        })
                    })
                );
                const clearResults = await Promise.all(clearRequests);
                const failedClears = clearResults.filter(r => !r.ok);
                if (failedClears.length > 0) {
                    throw new Error(`No se pudieron limpiar ${failedClears.length} ficha(s) antes de regenerar.`);
                }
            }

            // --- PASO B: Ejecutar la regeneración ---
            const payload = {
                empleadoId: employeeId,
                startDate: specificDateStr ?? format(startDate, 'yyyy-MM-dd'),
                endDate: specificDateStr ?? format(endDate, 'yyyy-MM-dd')
            };

            const res = await fetch(`${API_BASE_URL}/attendance/regenerate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error al regenerar registros');

            addNotification(
                'Regeneración exitosa',
                `Se han reprocesado las fichas de asistencia correctamente${specificDateStr ? ` para el día ${specificDateStr}` : ' para el periodo completo'}${allDaysToReset.length > 0 ? ` (${allDaysToReset.length} ficha(s) restablecida(s))` : ''}.`,
                'success'
            );

            await fetchData(); // Recargar datos internos del modal

            // Notificar a la pantalla padre para que actualice sus fichas
            if (onRegenerated) {
                const rStart = specificDateStr ? new Date(`${specificDateStr}T00:00:00`) : startDate;
                const rEnd = specificDateStr ? new Date(`${specificDateStr}T00:00:00`) : endDate;
                onRegenerated(employeeId, rStart, rEnd);
            }
        } catch (err: any) {
            addNotification('Error al regenerar', err.message || 'Ocurrió un error en el servidor', 'error');
        } finally {
            setIsRegenerating(false);
        }
    };

    const groupedData = useMemo(() => {
        const days: any[] = [];
        if (!startDate || !endDate) return days;
        const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        for (let i = 0; i < diffDays; i++) {
            const date = addDays(startOfDay(startDate), i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const diaSemana = getDay(date) === 0 ? 7 : getDay(date);

            const dayShifts = schedules.filter((s: any) => s.Fecha?.startsWith(dateStr)).map((turno: any) => {
                // ENRIQUECIMIENTO: Si el API de auditoría no trae comida, la buscamos en el catálogo
                const horarioId = turno.HorarioId || turno.HorarioIdAplicable;
                if (horarioId && scheduleCatalog.length > 0) {
                    const catalogueHorario = scheduleCatalog.find(h => h.HorarioId === horarioId);
                    if (catalogueHorario?.Turnos) {
                        const detail = catalogueHorario.Turnos.find((t: any) => t.DiaSemana === diaSemana);
                        if (detail) {
                            return { ...detail, ...turno }; // El turno de auditoría manda en horas, el catálogo rellena el resto
                        }
                    }
                }
                return turno;
            });
            const dayFicha = fichas.find((f: any) => f.Fecha?.startsWith(dateStr));

            const dayChecadas = rawChecadas
                .filter((c: any) => (c.FechaHora || c.Fecha)?.startsWith(dateStr))
                .map((c: any) => {
                    if (!c.FechaHora) return { ...c, isOutOfSchedule: true };
                    const timePart = c.FechaHora.replace('T', ' ').split(' ')[1];
                    if (!timePart) return { ...c, isOutOfSchedule: true };
                    const [hours, minutes] = timePart.split(':').map(Number);
                    const timePercent = ((hours * 60 + minutes) / (24 * 60)) * 100;

                    const isAtLeastInOneShift = dayShifts.some((turno: any) => {
                        if (!turno.HoraEntrada || !turno.HoraSalida) return false;
                        const minAntesEntrada = turno.MinutosAntesEntrada || 0;
                        const minDespuesSalida = turno.MinutosDespuesSalida || 0;
                        let winLeft = timeToPercent(turno.HoraEntrada, -minAntesEntrada);
                        let winRight = timeToPercent(turno.HoraSalida, minDespuesSalida);
                        if (winRight < winLeft) return timePercent >= winLeft || timePercent <= winRight;
                        return timePercent >= winLeft && timePercent <= winRight;
                    });
                    return { ...c, timePart, isOutOfSchedule: !isAtLeastInOneShift };
                })
                .sort((a: any, b: any) => {
                    if (!a.FechaHora || !b.FechaHora) return 0;
                    return a.FechaHora.localeCompare(b.FechaHora);
                });

            days.push({
                date,
                checadas: dayChecadas,
                ficha: dayFicha,
                shifts: dayShifts,
                scheduledHours: dayShifts.reduce((acc: number, s: any) => acc + calculateScheduledHours(s), 0),
                workedHours: dayShifts.reduce((acc: number, s: any) => acc + calculateWorkedHours(s, dayChecadas), 0),
                outOfScheduleCount: dayChecadas.filter((c: any) => c.isOutOfSchedule).length,
                events: (calendarEvents || []).filter((e: any) => {
                    const eDate = e.Fecha || e.fecha;
                    return eDate && String(eDate).substring(0, 10) === dateStr;
                })
            });
        }
        return days;
    }, [startDate, endDate, rawChecadas, fichas, schedules, calendarEvents]);



    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[--theme-100] text-[--theme-600]">
                            <ScanSearch size={20} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-slate-800 leading-tight">Auditoría de Asistencia</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-semibold text-slate-600">{employeeName}</span>
                                <span className="text-[10px] uppercase font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{employeeFicha}</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>

                    {can('asistencia.regenerar') && (
                        <Tooltip text="Regenerar todas las fichas visibles evaluando las checadas originales" placement="bottom" offset={8} triggerClassName="hidden sm:block">
                            <button
                                onClick={() => requestRegenerate()}
                                disabled={isRegenerating || isLoading}
                                className="flex flex-row items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg transition-all shadow-sm group"
                            >
                                <TimerReset size={15} strokeWidth={2.5} className={`${isRegenerating ? "animate-pulse text-amber-500" : "text-amber-500 group-hover:text-amber-600 drop-shadow-sm"}`} />
                                <span>{isRegenerating ? 'Procesando...' : 'Regenerar Periodo'}</span>
                            </button>
                        </Tooltip>
                    )}
                </div>
            }
            size="7xl"
            footer={
                <div className="flex justify-end w-full items-center">
                    <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                </div>
            }
        >
            {/* Confirmation Modal for Regeneration */}
            <ConfirmationModal
                isOpen={confirmRegenerate.isOpen}
                onClose={() => setConfirmRegenerate({ isOpen: false })}
                onConfirm={handleRegenerate}
                title={confirmRegenerate.date ? "Recalcular Día" : "Recalcular Periodo"}
                variant={(confirmRegenerate.manualDays?.length ?? 0) > 0 || (confirmRegenerate.validadoDays?.length ?? 0) > 0 ? 'warning' : 'info'}
                confirmText={isRegenerating ? "Procesando..." : "Sí, recalcular"}
                cancelText="Cancelar"
            >
                <div className="space-y-3">
                    <p className="font-medium text-slate-800">
                        ¿Deseas recalcular la asistencia {confirmRegenerate.date ? `del día ${confirmRegenerate.date}` : 'del periodo actual'}?
                    </p>
                    {((confirmRegenerate.manualDays?.length ?? 0) > 0 || (confirmRegenerate.validadoDays?.length ?? 0) > 0) ? (
                        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800 space-y-1">
                                <p className="font-bold">
                                    Las siguientes fichas se restablecerán a Borrador antes de regenerar:
                                </p>
                                {(confirmRegenerate.validadoDays?.length ?? 0) > 0 && (
                                    <p>• <strong>{confirmRegenerate.validadoDays!.length} día(s) ya aprobados</strong> (VALIDADO) volverán a estado Borrador.</p>
                                )}
                                {(confirmRegenerate.manualDays?.length ?? 0) > 0 && (
                                    <p>• <strong>{confirmRegenerate.manualDays!.length} ajuste(s) manual(es)</strong> serán eliminados.</p>
                                )}
                                <p className="mt-1">El sistema volverá a evaluar las checadas originales.</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-600">
                            Esta acción volverá a evaluar las checadas contra el horario asignado.
                        </p>
                    )}
                </div>
            </ConfirmationModal>

            <div className="p-2 bg-slate-50">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[400px]">
                        <Loader2 className="animate-spin text-sky-500 mb-4" size={48} />
                        <p className="text-slate-500 font-medium italic">Sincronizando registros del checador...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-red-500">
                        <AlertCircle size={48} className="mb-4" />
                        <p className="text-lg font-bold">Error de sincronización</p>
                        <p className="text-sm opacity-80">{error}</p>
                    </div>
                ) : (
                    <div className="w-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-x-auto flex-1 custom-scrollbar">
                            <div className="flex w-max divide-x divide-slate-200">
                                {groupedData.map(({ date, events, checadas, ficha, shifts, outOfScheduleCount }, idx) => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                                    const getEstadoStyle = (estado: string) => {
                                        switch (estado) {
                                            case 'BLOQUEADO': return 'bg-red-50 text-red-600 border-red-200';
                                            case 'VALIDADO': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
                                            case 'SIN_HORARIO': return 'bg-amber-50 text-amber-600 border-amber-200';
                                            case 'BORRADOR': return 'bg-slate-100 text-slate-600 border-slate-200';
                                            default: return 'bg-slate-50 text-slate-500 border-slate-200';
                                        }
                                    };

                                    const isRestDay = shifts.length === 0 || shifts.every((s: any) => s.EsDescansoAsignado || !s.EsDiaLaboral);
                                    const hasSpecialEvent = events && events.some((e: any) => {
                                        const name = e.Nombre || e.nombre || '';
                                        return name.toLowerCase().includes('feriado') || name.toLowerCase().includes('natalicio') || (e.TipoEventoId || e.tipoEventoId) === 'DIA_FERIADO';
                                    });

                                    let headerBgClass = 'bg-slate-50/50';
                                    if (isRestDay) headerBgClass = 'bg-slate-100/80';
                                    if (hasSpecialEvent) headerBgClass = 'bg-rose-50/40';
                                    else if (events && events.length > 0) headerBgClass = 'bg-indigo-50/30';

                                    return (
                                        <div key={idx} className={`flex-shrink-0 w-80 flex flex-col ${isToday ? 'bg-sky-50/20' : 'bg-white'}`}>
                                            {/* Top Header per day - More compact */}
                                            <div className={`px-3 py-2 h-[52px] flex flex-col items-center justify-center border-b border-slate-200 ${headerBgClass} text-center relative group/header`}>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-0.5 leading-none">{format(date, 'EEEE', { locale: es })}</span>

                                                {can('asistencia.regenerar') && (
                                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 p-0 m-0 z-30 opacity-0 group-hover/header:opacity-100 transition-all">
                                                        <Tooltip text={`Regenerar ficha del ${format(date, 'dd MMM', { locale: es })}`} placement="top" offset={6}>
                                                            <button
                                                                onClick={() => requestRegenerate(dateStr)}
                                                                disabled={isRegenerating || isLoading}
                                                                className="flex items-center justify-center p-1.5 text-amber-500 bg-white hover:text-amber-600 border border-slate-200 hover:border-amber-300 hover:bg-amber-50 rounded-md shadow-sm transition-all"
                                                            >
                                                                <TimerReset size={14} strokeWidth={2.5} className={isRegenerating ? "animate-pulse" : ""} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-center gap-1.5 h-6 leading-none">
                                                    <span className="text-lg font-semibold text-slate-700 leading-none">{format(date, 'dd MMM', { locale: es })}</span>
                                                    {events && events.length > 0 && (
                                                        <div className="flex gap-1 z-20 items-center">
                                                            <CalendarEventList events={events} size={15} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Timeline Area (Center) - Proportional Scale h-64 with overflow visibility */}
                                            <div
                                                className="relative h-64 w-full flex-none overflow-visible group/timeline"
                                                onClick={() => setActiveChecadaId(null)}
                                            >
                                                {/* Vertical Hour Grids */}
                                                <div className="absolute inset-0 z-0 pointer-events-none">
                                                    {[...Array(24)].map((_, hour) => {
                                                        if (hour === 0 || hour === 24) return null;
                                                        const isMajorHour = hour % 6 === 0;
                                                        return (
                                                            <div key={hour} className={`absolute top-0 h-full border-l ${isMajorHour ? 'border-slate-300 border-dashed' : 'border-slate-100'}`} style={{ left: `${(hour / 24) * 100}%` }}>
                                                                {isMajorHour && (
                                                                    <span className="absolute bottom-2 -translate-x-1/2 text-[9px] font-bold text-slate-400 bg-white/80 px-1 rounded">{`${hour}:00`}</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Main Horizontal Axis */}
                                                <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-300 z-10" />

                                                {/* Shifts Bars */}
                                                {shifts?.map((turno: any, tIdx: number) => {
                                                    if (turno.EsDescansoAsignado || !turno.EsDiaLaboral || !turno.HoraEntrada || !turno.HoraSalida) return null;

                                                    const colors = getColorClasses(turno.ColorUI || turno.Color || 'slate');
                                                    const tolerance = turno.MinutosTolerancia || 0;
                                                    const minAntes = turno.MinutosAntesEntrada || 0;
                                                    const minDespues = turno.MinutosDespuesSalida || 0;

                                                    const entMin = timeToPercent(turno.HoraEntrada);
                                                    let salMin = timeToPercent(turno.HoraSalida);

                                                    // Determinar si cruza medianoche
                                                    const crossMidnight = salMin <= entMin;

                                                    // Definir los fragmentos a dibujar (si cruza, son dos)
                                                    const fragments = crossMidnight
                                                        ? [{ l: entMin, w: 100 - entMin, type: 'start' }, { l: 0, w: salMin, type: 'end' }]
                                                        : [{ l: entMin, w: salMin - entMin, type: 'full' }];

                                                    return (
                                                        <React.Fragment key={tIdx}>
                                                            {fragments.map((frag, fIdx) => (
                                                                <div key={fIdx} className="absolute inset-0 z-20 pointer-events-none">
                                                                    {/* Capture Window (Margins) */}
                                                                    {(minAntes > 0 || minDespues > 0) && (
                                                                        <div
                                                                            className="absolute top-1/2 -translate-y-1/2 h-32 pointer-events-auto"
                                                                            style={{
                                                                                left: `${frag.l - (frag.type === 'start' || frag.type === 'full' ? timeToPercent('00:00', minAntes) : 0)}%`,
                                                                                width: `${frag.w + (frag.type === 'start' ? timeToPercent('00:00', minAntes) : frag.type === 'end' ? timeToPercent('00:00', minDespues) : timeToPercent('00:00', minAntes + minDespues))}%`
                                                                            }}
                                                                        >
                                                                            <Tooltip text={`Ventana de captura: -${minAntes}m a +${minDespues}m`} placement="top" offset={12} triggerClassName="w-full h-full block">
                                                                                <div className={`w-full h-full ${colors.bg} bg-opacity-10 border-x-2 border-slate-200`} />
                                                                            </Tooltip>
                                                                        </div>
                                                                    )}

                                                                    {/* Main Shift Block */}
                                                                    <div
                                                                        className="absolute top-1/2 -translate-y-1/2 h-32 pointer-events-auto overflow-hidden"
                                                                        style={{ left: `${frag.l}%`, width: `${frag.w}%` }}
                                                                    >
                                                                        <Tooltip
                                                                            text={`${turno.NombreHorario || turno.Nombre || 'Turno'}: ${turno.HoraEntrada} - ${turno.HoraSalida}`}
                                                                            placement="top" offset={12} triggerClassName="w-full h-full block"
                                                                        >
                                                                            <div className={`w-full h-full ${colors.bg} border-2 ${colors.border} shadow-md flex flex-col relative`}>
                                                                                {/* Lunch Block (if exists) */}
                                                                                {(() => {
                                                                                    // Detección ultra-flexible
                                                                                    const hIni = turno.HoraInicioComida || turno.horaInicioComida || turno.HoraComidaInicio;
                                                                                    const hFin = turno.HoraFinComida || turno.horaFinComida || turno.HoraComidaFin;
                                                                                    const hasMeal = !!(turno.TieneComida || turno.tieneComida || (hIni && hIni !== '00:00:00' && hIni !== '00:00'));

                                                                                    if (!hasMeal || !hIni || !hFin) return null;
                                                                                    if (hIni === '00:00:00' || hIni === '00:00') return null;

                                                                                    let cStart = timeToPercent(hIni);
                                                                                    let cEnd = timeToPercent(hFin);

                                                                                    if (crossMidnight && frag.type === 'start' && cStart < entMin) {
                                                                                        cStart += 100;
                                                                                        cEnd += 100;
                                                                                    }
                                                                                    if (crossMidnight && frag.type === 'end' && cEnd > salMin) {
                                                                                        cStart -= 100;
                                                                                        cEnd -= 100;
                                                                                    }

                                                                                    if (cEnd < cStart) cEnd += 100;

                                                                                    const intersectL = Math.max(frag.l, cStart);
                                                                                    const intersectR = Math.min(frag.l + frag.w, cEnd);

                                                                                    if (intersectR <= intersectL + 0.1) return null;

                                                                                    return (
                                                                                        <div
                                                                                            key={0}
                                                                                            className="absolute inset-y-1.5 bg-slate-900/40 backdrop-blur-[2px] border border-white/30 rounded-md flex items-center justify-center z-[5] shadow-inner group/meal overflow-hidden"
                                                                                            style={{
                                                                                                left: `${((intersectL - frag.l) / frag.w) * 100}%`,
                                                                                                width: `${((intersectR - intersectL) / frag.w) * 100}%`,
                                                                                                minWidth: '16px'
                                                                                            }}
                                                                                        >
                                                                                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)', backgroundSize: '8px 8px' }} />
                                                                                            <Tooltip text={`Periodo de Comida: ${hIni} - ${hFin}`}>
                                                                                                <div className="w-full h-full flex items-center justify-center relative">
                                                                                                    <Coffee size={16} className="text-white opacity-80 group-hover/meal:scale-110 transition-transform drop-shadow-sm" />
                                                                                                </div>
                                                                                            </Tooltip>
                                                                                        </div>
                                                                                    );
                                                                                })()}

                                                                                {tolerance > 0 && (frag.type === 'start' || frag.type === 'full') && (
                                                                                    <div
                                                                                        className="absolute top-0 bottom-0 bg-white/30 border-r border-white/50 z-10"
                                                                                        style={{ left: 0, width: `${(tolerance / (frag.w * 14.4)) * 100}%` }}
                                                                                    >
                                                                                        <div className="h-full w-full flex items-end p-0.5 overflow-hidden">
                                                                                            <span className="text-[7px] text-white/70 font-bold whitespace-nowrap">+{tolerance}m</span>
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {(frag.type === 'start' || frag.type === 'full') && (
                                                                                    <div className="flex-1 flex flex-col items-center justify-center p-1 text-white select-none">
                                                                                        <span className="text-[8px] font-bold uppercase opacity-60 tracking-tighter">Inicio</span>
                                                                                        <span className="text-[11px] font-black leading-none">{turno.HoraEntrada}</span>
                                                                                    </div>
                                                                                )}
                                                                                {(frag.type === 'end' || frag.type === 'full') && (
                                                                                    <div className="flex-1 flex flex-col items-center justify-center p-1 text-white border-t border-white/20 select-none bg-black/5">
                                                                                        <span className="text-[11px] font-black leading-none">{turno.HoraSalida}</span>
                                                                                        <span className="text-[8px] font-bold uppercase opacity-60 tracking-tighter">Fin</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </Tooltip>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </React.Fragment>
                                                    );
                                                })}

                                                <div className="absolute inset-0 z-30 pointer-events-none">
                                                    {checadas.map((c: any, cIdx: number) => {
                                                        if (!c.FechaHora) return null;
                                                        const timePart = c.FechaHora.replace('T', ' ').split(' ')[1];
                                                        if (!timePart) return null;

                                                        const [hours, minutes] = timePart.split(':').map(Number);
                                                        const left = ((hours * 60 + minutes) / (24 * 60)) * 100;
                                                        const timeFormat = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

                                                        const isTop = cIdx % 2 === 0;
                                                        const isCurrentlyActive = activeChecadaId === c.ChecadaId;

                                                        return (
                                                            <div
                                                                key={cIdx}
                                                                className={`absolute top-1/2 pointer-events-auto transition-all duration-200 ${isCurrentlyActive ? 'z-[60]' : 'hover:z-50'}`}
                                                                style={{ left: `${left}%` }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveChecadaId(isCurrentlyActive ? null : c.ChecadaId);
                                                                }}
                                                            >
                                                                <Tooltip text={`${c.isOutOfSchedule ? 'Fuera de horario' : 'En rango'} - ${timeFormat} (${c.Dispositivo || c.Checador || 'Reloj'})`} placement="top" offset={12}>
                                                                    <div className={`absolute left-0 flex ${isTop ? 'flex-col-reverse bottom-0' : 'flex-col top-0'} items-center -translate-x-1/2`}>
                                                                        <div className={`w-0.5 h-20 ${c.isOutOfSchedule ? 'bg-red-600' : 'bg-emerald-600'} opacity-100 shadow-sm`} />
                                                                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-black border-2 shadow-lg transition-transform hover:scale-110 z-10 ${c.isOutOfSchedule
                                                                            ? 'bg-red-50 text-red-700 border-red-600'
                                                                            : 'bg-white text-emerald-700 border-emerald-600'
                                                                            } ${isCurrentlyActive ? 'scale-110' : ''}`}>
                                                                            {timeFormat}
                                                                        </div>
                                                                    </div>
                                                                    <div className={`absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md z-50 ${c.isOutOfSchedule ? 'bg-red-600' : 'bg-emerald-600'}`} />
                                                                </Tooltip>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="mt-auto px-3 py-3 border-t border-slate-200 bg-slate-50 flex flex-col justify-center gap-1.5">
                                                <div className="flex flex-nowrap items-center justify-between gap-4">
                                                    <div className="flex flex-nowrap gap-4 ml-2">
                                                        {ficha?.EstatusChecadorAbrev && (
                                                            <Tooltip text={`Registro: ${ficha.EstatusChecadorUI || ficha.EstatusChecadorAbrev}`}>
                                                                <div className="flex items-center gap-3 shrink-0">
                                                                    <span className={`text-2xl font-black tracking-tighter drop-shadow-sm ${getColorClasses(ficha.EstatusChecadorColor || 'slate').text}`}>
                                                                        {ficha.EstatusChecadorAbrev}
                                                                    </span>
                                                                    <div className="flex flex-col text-left">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Checador</span>
                                                                        <span className="text-xs font-black text-slate-700 leading-tight max-w-[120px] whitespace-normal break-words">
                                                                            {statusCatalog.find(s => s.Abreviatura === ficha.EstatusChecadorAbrev)?.Descripcion || ficha.EstatusChecadorUI || 'Asistencia'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </Tooltip>
                                                        )}
                                                        {ficha?.EstatusManualAbrev && (
                                                            <Tooltip text={`Manual: ${ficha.EstatusManualUI || ficha.EstatusManualAbrev}`}>
                                                                <div className="flex items-center gap-3 shrink-0">
                                                                    <span className={`text-2xl font-black tracking-tighter drop-shadow-sm ${getColorClasses(ficha.EstatusManualColor || 'slate').text}`}>
                                                                        {ficha.EstatusManualAbrev}
                                                                    </span>
                                                                    <div className="flex flex-col text-left">
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Manual</span>
                                                                        <span className="text-xs font-black text-slate-700 leading-tight max-w-[120px] whitespace-normal break-words">
                                                                            {statusCatalog.find(s => s.Abreviatura === ficha.EstatusManualAbrev)?.Descripcion || ficha.EstatusManualUI || 'Asistencia'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </Tooltip>
                                                        )}
                                                    </div>

                                                    {(ficha?.Estado || ficha?.estado) && (
                                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border-2 uppercase tracking-tight ${getEstadoStyle(ficha.Estado || ficha.estado)}`}>
                                                            {(ficha.Estado || ficha.estado).replace('_', ' ')}
                                                        </span>
                                                    )}
                                                </div>

                                                {!isRestDay && (
                                                    <div className="flex items-center justify-between mt-1 px-1 border-t border-slate-200/60 pt-1.5 opacity-60 text-[9px] uppercase font-bold tracking-tight">
                                                        <Tooltip text={`${groupedData[idx].scheduledHours.toFixed(1)}h programadas`}>
                                                            <div className="flex items-center gap-1.5 text-slate-500 cursor">
                                                                <span className="opacity-70">Jornada:</span>
                                                                <span className="text-slate-700 font-black">{groupedData[idx].scheduledHours.toFixed(1)}h</span>
                                                            </div>
                                                        </Tooltip>
                                                        <Tooltip text={`${groupedData[idx].workedHours.toFixed(1)}h laboradas`}>
                                                            <div className={`flex items-center gap-1.5 cursor ${groupedData[idx].workedHours >= groupedData[idx].scheduledHours ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                                <span className="opacity-70">Laborado:</span>
                                                                <span className="font-black">{groupedData[idx].workedHours.toFixed(1)}h</span>
                                                            </div>
                                                        </Tooltip>
                                                    </div>
                                                )}

                                                {outOfScheduleCount > 0 && (
                                                    <div className="flex items-center justify-center gap-1.5 w-full bg-red-50 text-red-700 border-2 border-red-200 py-1.5 px-3 rounded-lg mt-1">
                                                        <AlertTriangle size={14} className="shrink-0" />
                                                        <span className="text-[11px] font-black">{outOfScheduleCount} checada(s) fuera de rango</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 bg-white p-3 flex flex-wrap items-center justify-center gap-6">
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-2 bg-slate-100 border border-slate-300 border-dashed rounded-sm" />
                                <span className="text-xs font-medium text-slate-500">Ventana Captura</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-4 h-2 bg-[--theme-500] rounded`} />
                                <span className="text-xs font-medium text-slate-500">Horario</span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-4 border-l border-slate-200 pl-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm" />
                                <span className="text-xs font-medium text-slate-500">En Rango</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white shadow-sm" />
                                <span className="text-xs font-medium text-slate-500">Fuera de Rango</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
