import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfDay, addDays, isAfter } from 'date-fns';
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

export const AuditTimelineModal: React.FC<AuditTimelineModalProps> = ({
    employeeId, employeeName, employeeFicha, startDate, endDate, onClose, getToken, statusCatalog = [], onRegenerated
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
    // date: día específico a regenerar (si aplica); manualDays: fechas con ajuste manual que se perderán
    const [confirmRegenerate, setConfirmRegenerate] = useState<{ isOpen: boolean; date?: string; manualDays?: string[] }>({ isOpen: false });

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
     * Determina qué días dentro del rango a regenerar tienen ajuste manual
     * (EstatusManualAbrev con valor), para advertir al usuario antes de continuar.
     */
    const getManualDaysInRange = (specificDateStr?: string): string[] => {
        return fichas
            .filter(f => {
                if (!f.EstatusManualAbrev) return false;
                const fichaDate = f.Fecha?.substring(0, 10);
                if (!fichaDate) return false;
                if (specificDateStr) return fichaDate === specificDateStr;
                // Rango completo: comparar contra startDate..endDate
                return fichaDate >= format(startDate, 'yyyy-MM-dd') && fichaDate <= format(endDate, 'yyyy-MM-dd');
            })
            .map(f => f.Fecha.substring(0, 10));
    };

    /** Paso 1: El usuario pide regenerar — detectar manuales y pedir confirmación */
    const requestRegenerate = (specificDateStr?: string) => {
        const manualDays = getManualDaysInRange(specificDateStr);
        setConfirmRegenerate({ isOpen: true, date: specificDateStr, manualDays });
    };

    /** Paso 2: El usuario confirma — limpiar manuales si los hay, luego regenerar */
    const handleRegenerate = async () => {
        const { date: specificDateStr, manualDays = [] } = confirmRegenerate;
        const token = getToken();
        if (!token) return;

        setIsRegenerating(true);
        setConfirmRegenerate({ isOpen: false });

        try {
            // --- PASO A: Limpiar ajustes manuales si los hay ---
            // Usamos el endpoint /attendance (sp_FichasAsistencia_SaveManual) con estatusManual=null
            // para dejar la ficha en estado BORRADOR antes de regenerar.
            if (manualDays.length > 0) {
                const clearRequests = manualDays.map(dateStr =>
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
                    throw new Error(`No se pudieron limpiar ${failedClears.length} ajuste(s) manual(es) antes de regenerar.`);
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
                `Se han reprocesado las fichas de asistencia correctamente${specificDateStr ? ` para el día ${specificDateStr}` : ' para el periodo completo'}${manualDays.length > 0 ? ` (${manualDays.length} ajuste(s) manual(es) limpiado(s))` : ''}.`,
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

            const dayShifts = schedules.filter((s: any) => s.Fecha?.startsWith(dateStr));
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
                    return { ...c, isOutOfSchedule: !isAtLeastInOneShift };
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
                variant={(confirmRegenerate.manualDays?.length ?? 0) > 0 ? 'warning' : 'info'}
                confirmText={isRegenerating ? "Procesando..." : "Sí, recalcular"}
                cancelText="Cancelar"
            >
                <div className="space-y-3">
                    <p className="font-medium text-slate-800">
                        ¿Deseas recalcular la asistencia {confirmRegenerate.date ? `del día ${confirmRegenerate.date}` : 'del periodo actual'}?
                    </p>
                    {(confirmRegenerate.manualDays?.length ?? 0) > 0 ? (
                        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800 space-y-1">
                                <p className="font-bold">
                                    {confirmRegenerate.date
                                        ? 'Este día tiene un ajuste manual que se eliminará antes de regenerar.'
                                        : `${confirmRegenerate.manualDays!.length} día(s) tienen ajustes manuales que se eliminarán antes de regenerar:`}
                                </p>
                                {!confirmRegenerate.date && (
                                    <ul className="list-disc list-inside space-y-0.5 font-mono">
                                        {confirmRegenerate.manualDays!.map(d => <li key={d}>{d}</li>)}
                                    </ul>
                                )}
                                <p>La asistencia quedará en estado <strong>Borrador</strong> y el sistema volverá a evaluarla desde las checadas originales.</p>
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

                                                    const left = timeToPercent(turno.HoraEntrada);
                                                    const right = timeToPercent(turno.HoraSalida);
                                                    const captureLeft = timeToPercent(turno.HoraEntrada, -minAntes);
                                                    const captureRight = timeToPercent(turno.HoraSalida, minDespues);

                                                    return (
                                                        <div key={tIdx} className="absolute inset-0 z-20 pointer-events-none">
                                                            {/* Capture Window (Margins) - Color matching shift but lighter */}
                                                            {(minAntes > 0 || minDespues > 0) && (
                                                                <div
                                                                    className="absolute top-1/2 -translate-y-1/2 h-32 pointer-events-auto"
                                                                    style={{ left: `${captureLeft}%`, width: `${captureRight - captureLeft}%` }}
                                                                >
                                                                    <Tooltip
                                                                        text={`Ventana de captura: -${minAntes}m a +${minDespues}m`}
                                                                        placement="top" offset={12}
                                                                        triggerClassName="w-full h-full block"
                                                                    >
                                                                        <div className={`w-full h-full ${colors.bg} bg-opacity-20 border-x-2 border-slate-300`} />
                                                                    </Tooltip>
                                                                </div>
                                                            )}

                                                            {/* Main Shift Block - Proportional scale h-32 */}
                                                            <div
                                                                className="absolute top-1/2 -translate-y-1/2 h-32 pointer-events-auto"
                                                                style={{ left: `${left}%`, width: `${right - left}%` }}
                                                            >
                                                                <Tooltip
                                                                    text={`${turno.NombreHorario || turno.Nombre || 'Turno'}: ${turno.HoraEntrada} - ${turno.HoraSalida}`}
                                                                    placement="top" offset={12}
                                                                    triggerClassName="w-full h-full block"
                                                                >
                                                                    <div className={`w-full h-full ${colors.bg} border-2 ${colors.border} shadow-md flex flex-col`}>
                                                                        {/* Hour Content */}
                                                                        <div className="flex-1 flex flex-col items-center justify-around p-1.5">
                                                                            <div className="flex flex-col items-center">
                                                                                <span className="text-[7px] font-bold text-white/50 uppercase mb-0.5">Inicio</span>
                                                                                <span className="text-xs font-black text-white leading-none">{turno.HoraEntrada}</span>
                                                                            </div>

                                                                            {(right - left > 15) && (turno.HoraInicioComida && <Coffee size={14} className="text-white opacity-40 shrink-0" />)}

                                                                            <div className="flex flex-col items-center">
                                                                                <span className="text-xs font-black text-white leading-none">{turno.HoraSalida}</span>
                                                                                <span className="text-[7px] font-bold text-white/50 uppercase mt-0.5">Fin</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Shift Name - Now below the block as requested */}
                                                                        <div className="absolute top-full left-0 right-0 -mt-1.5 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                                                                                {turno.HorarioNombre || turno.NombreHorario || turno.Abreviatura || turno.Nombre || 'Horario'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </Tooltip>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Checadas (Dots) */}
                                                <div
                                                    className="absolute inset-0 z-30 pointer-events-none"
                                                >
                                                    {checadas.map((c: any, cIdx: number) => {
                                                        if (!c.FechaHora) return null;
                                                        const timePart = c.FechaHora.replace('T', ' ').split(' ')[1];
                                                        if (!timePart) return null;

                                                        const [hours, minutes] = timePart.split(':').map(Number);
                                                        const left = ((hours * 60 + minutes) / (24 * 60)) * 100;
                                                        const timeFormat = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

                                                        // Stagger vertically so they don't overlap easily
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
                                                                        {/* Stem - First element in flex flow to touch the axis point */}
                                                                        <div className={`w-0.5 h-20 ${c.isOutOfSchedule ? 'bg-red-600' : 'bg-emerald-600'} opacity-100 shadow-sm`} />

                                                                        {/* Time Label (Pill) */}
                                                                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-black border-2 shadow-lg transition-transform hover:scale-110 z-10 ${c.isOutOfSchedule
                                                                            ? 'bg-red-50 text-red-700 border-red-600'
                                                                            : 'bg-white text-emerald-700 border-emerald-600'
                                                                            } ${isCurrentlyActive ? 'scale-110' : ''}`}>
                                                                            {timeFormat}
                                                                        </div>
                                                                    </div>
                                                                    {/* Center Dot - Highest precision z-50 */}
                                                                    <div className={`absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md z-50 ${c.isOutOfSchedule ? 'bg-red-600' : 'bg-emerald-600'
                                                                        }`} />
                                                                </Tooltip>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Footer per day */}
                                            <div className="mt-auto px-3 py-4 border-t border-slate-200 bg-slate-50 min-h-[90px] flex flex-col justify-center gap-2">
                                                {/* Top row: Statuses R/M */}
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

                                                    {/* Badge de Estado global del día */}
                                                    {(ficha?.Estado || ficha?.estado) && (
                                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border-2 uppercase tracking-tight ${getEstadoStyle(ficha.Estado || ficha.estado)}`}>
                                                            {(ficha.Estado || ficha.estado).replace('_', ' ')}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Bottom row: Warnings */}
                                                {outOfScheduleCount > 0 && (
                                                    <div className="flex items-center justify-center gap-1.5 w-full bg-red-50 text-red-700 border-2 border-red-200 py-1.5 px-3 rounded-lg">
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

                        {/* Flat Legend */}
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
