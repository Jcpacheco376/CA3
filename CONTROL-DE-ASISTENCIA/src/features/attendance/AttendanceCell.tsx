// src/features/attendance/AttendanceCell.tsx
import React, { useState, useEffect, useRef, memo } from 'react';
import { AttendanceStatus, AttendanceStatusCode } from '../../types';
import { Clock, MessageSquare, Lock, AlertTriangle } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Tooltip } from '../../components/ui/Tooltip';
import { isDateWithinEmploymentRange, parseLocal } from '../../utils/attendanceValidation';
import { statusColorPalette } from '../../config/theme';
import { StatusSelectorGrid } from './StatusSelectorGrid';

const getColorClasses = (colorName: string = 'slate') => {
    const palette = statusColorPalette[colorName] || statusColorPalette.slate;
    return {
        bgText: palette.bgText,
        border: palette.border,
        lightBorder: palette.lightBorder,
        pastel: (palette as any).pastel || `bg-${colorName}-50 text-${colorName}-700`
    };
};

// --- OPTIMIZACIÓN: Estilo estático fuera del componente ---
const BLOCKED_PATTERN_STYLE = {
    backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(255, 255, 255, 0.15) 10px, rgba(255, 255, 255, 0.15) 20px)'
};

const FichaTooltip = memo(({ ficha, isRestDay, statusCatalog, isOutOfBounds, fechaIngreso, fechaBaja, fecha }: { ficha: any, isRestDay: boolean, statusCatalog: AttendanceStatus[], isOutOfBounds: boolean, fechaIngreso?: string, fechaBaja?: string, fecha: Date }) => {
    if (isOutOfBounds) {
        let msg = "Fecha fuera del rango de contratación.";
        if (fechaIngreso && isSameDay(fecha, new Date(fechaIngreso.substring(0, 10)))) msg = "Fecha de Ingreso / Contratación.";
        if (fechaBaja && isSameDay(fecha, new Date(fechaBaja.substring(0, 10)))) msg = "Fecha de Baja / Terminación.";
        return <span>{msg}</span>;
    }

    if (isRestDay) return <span>Día de descanso.</span>;

    // --- CORRECCIÓN: Si es borrador limpio, tratar como sin registro ---
    const isCleanBorrador = ficha?.Estado === 'BORRADOR' && !ficha.EstatusManualAbrev && !ficha.EstatusChecadorAbrev;
    if (!ficha || isCleanBorrador) return <span>Sin registro del checador para este día.</span>;

    const formatTime = (dateString: string) => {
        if (!dateString) return '--:--';
        return format(new Date(dateString), 'HH:mm');
    };

    const isBlocked = ficha.Estado === 'BLOQUEADO';
    const isProcessing = ficha.Estado === 'EN_PROCESO';
    const isNoSchedule = ficha.Estado === 'SIN_HORARIO';

    return (
        <div className="text-left text-xs p-1">
            {isBlocked && <div className="mb-1 pb-1 border-b border-red-200 text-red-600 font-bold flex items-center gap-1"><Lock size={12} /> Ficha bloqueada</div>}
            {ficha.IncidenciaActivaId && <div className="mb-1 pb-1 border-b border-amber-200 text-amber-600 font-bold flex items-center gap-1"><AlertTriangle size={12} /> Con incidencia activa #{ficha.IncidenciaActivaId}</div>}

            {isProcessing && <p className="font-semibold text-amber-600 mb-1">Turno en progreso...</p>}

            {isNoSchedule && (
                <div className="mb-1 pb-1 border-b border-orange-200 text-orange-700 font-bold">
                    ⚠️ Sin horario asignado.
                    <div className="font-normal text-slate-500 mt-0.5">Asigne un horario para calcular esta ficha.</div>
                </div>
            )}

            <p><span className="font-semibold">Checador:</span> {statusCatalog.find(s => s.Abreviatura === ficha.EstatusChecadorAbrev)?.Descripcion || 'N/A'}</p>
            <p><span className="font-semibold">Manual:</span> {statusCatalog.find(s => s.Abreviatura === ficha.EstatusManualAbrev)?.Descripcion || 'Pendiente'}</p>

            {ficha.Comentarios && <p className="mt-1 italic text-slate-500">"{ficha.Comentarios}"</p>}
            <hr className="my-1 border-slate-200" />
            <div className="flex items-center gap-2"> <Clock size={14} /> <span>{formatTime(ficha.HoraEntrada)} - {formatTime(ficha.HoraSalida)}</span> </div>
        </div>
    );
});

export const AttendanceCell = memo(({
    cellId, isOpen, onToggleOpen, ficha, onStatusChange, isRestDay,
    onDragStart, onDragEnter, isBeingDragged, isAnyCellOpen,
    statusCatalog, isToday, viewMode, canAssign,
    fecha, fechaIngreso, fechaBaja
}: any) => {
    const isOutOfBounds = !isDateWithinEmploymentRange(fecha, fechaIngreso, fechaBaja);
    const isIngresoDate = fechaIngreso && isSameDay(fecha, parseLocal(fechaIngreso));
    const isBajaDate = fechaBaja && isSameDay(fecha, parseLocal(fechaBaja));

    const [isJustUpdated, setIsJustUpdated] = useState(false);
    const wrapperRef = useRef<HTMLTableCellElement>(null);

    // --- CORRECCIÓN CRÍTICA PARA FICHAS BORRADOR/FUTURAS ---
    // Si la ficha existe pero está en estado BORRADOR y no tiene estatus, es visualmente un "-" (Vacío)
    const isCleanBorrador = ficha?.Estado === 'BORRADOR' && !ficha.EstatusManualAbrev && !ficha.EstatusChecadorAbrev;

    let finalStatus = 'F';
    if (isRestDay) finalStatus = 'D';
    else if (ficha?.EstatusManualAbrev) finalStatus = ficha.EstatusManualAbrev;
    else if (ficha?.EstatusChecadorAbrev) finalStatus = ficha.EstatusChecadorAbrev;
    else if (!ficha || isCleanBorrador) finalStatus = '-'; // <--- AQUÍ EL CAMBIO

    const currentStatusConfig = statusCatalog.find((s: any) => s.Abreviatura === finalStatus) || (finalStatus === '-' ? { ColorUI: 'slate', Descripcion: 'No generado', PermiteComentario: false } : { ColorUI: 'blue', Descripcion: 'Desconocido', PermiteComentario: true });
    const theme = isOutOfBounds ? getColorClasses('slate') : getColorClasses(currentStatusConfig.ColorUI);

    const isProcessing = ficha?.Estado === 'EN_PROCESO';
    const isBlocked = ficha?.Estado === 'BLOQUEADO';
    const isNoSchedule = ficha?.Estado === 'SIN_HORARIO';
    const hasActiveIncident = !!ficha?.IncidenciaActivaId;

    const needsManualAction = !ficha?.EstatusManualAbrev && !isRestDay && !isOutOfBounds;
    // Si la fecha está fuera del rango de empleo, NO es interactivo
    const isInteractive = canAssign && !isProcessing && !isBlocked && !isRestDay && !isNoSchedule && !isOutOfBounds;

    const prevStatusRef = useRef(ficha?.EstatusManualAbrev);
    useEffect(() => {
        const currentStatus = ficha?.EstatusManualAbrev;
        if (prevStatusRef.current !== currentStatus) {
            if (currentStatus) { setIsJustUpdated(true); setTimeout(() => setIsJustUpdated(false), 300); }
        }
        prevStatusRef.current = currentStatus;
    }, [ficha?.EstatusManualAbrev]);

    const handleToggle = () => { if (!isInteractive) return; onToggleOpen(cellId); };

    const bgClass = isOutOfBounds ? 'bg-slate-50 text-slate-300' : (needsManualAction && !isProcessing && !isBlocked ? theme.pastel : theme.bgText);
    let borderClass = isOutOfBounds ? 'border-b-4 border-slate-100' : (needsManualAction && !isProcessing && !isBlocked ? `border-2 border-dashed ${theme.lightBorder}` : `border-b-4 ${theme.border}`);
    if (isNoSchedule && !isOutOfBounds) borderClass = `border-2 border-dashed border-amber-300`;

    const cellContent = (
        <div className={`relative w-24 h-16 mx-auto rounded-md font-bold text-lg flex items-center justify-center transition-all duration-200 group ${isBeingDragged || isOpen ? 'ring-4 ring-blue-500/50' : ''} ${isBlocked || isOutOfBounds ? 'cursor-not-allowed' : ''} ${isInteractive ? 'hover:-translate-y-0.5 shadow-sm' : ''} ${isJustUpdated ? 'animate-drop-in' : ''} ${borderClass}`}>
            <div className={`w-full h-full rounded-md ${bgClass} ${isBlocked || isOutOfBounds ? 'bg-opacity-100' : (!isInteractive ? 'bg-opacity-70' : 'bg-opacity-90')} flex items-center justify-center shadow-inner-sm relative overflow-hidden`}>

                {/* Diseño para Bloqueado o Fuera de Rango */}
                {(isBlocked || isOutOfBounds) && (
                    <>
                        <div className="absolute inset-0 pointer-events-none z-0"
                            style={BLOCKED_PATTERN_STYLE}
                        />
                        <div className="absolute bottom-1 right-1 text-slate-900/10 pointer-events-none z-0">
                            {isBlocked ? <Lock size={20} strokeWidth={2} /> : null}
                        </div>
                    </>
                )}

                <div className={`relative z-10 ${isOutOfBounds ? 'opacity-30' : ''}`}>
                    {isNoSchedule ? (
                        <div className="flex flex-col items-center justify-center gap-0.5">
                            <AlertTriangle size={22} className="text-amber-500 opacity-90" />
                            <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Sin Horario</span>
                        </div>
                    ) : (
                        finalStatus
                    )}
                </div>
            </div>
            {hasActiveIncident && <div className="absolute -top-2 -left-2 bg-purple-100 text-purple-600 rounded-full p-1 border border-purple-200 shadow-sm z-10"><AlertTriangle size={12} /></div>}
            {isProcessing && <Tooltip text="Turno en progreso..."><Clock size={16} className="absolute bottom-1 right-1 text-amber-600 animate-pulse" /></Tooltip>}
            {ficha?.Comentarios && <MessageSquare size={14} className="absolute bottom-1 left-1 text-black/40" />}

            {/* Indicadores de Ingreso / Baja: Triángulo discreto en esquina (estilo Excel) */}
            {isIngresoDate && (
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-t-emerald-500 border-l-[8px] border-l-transparent z-20 pointer-events-none" />
            )}
            {isBajaDate && (
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[8px] border-t-rose-500 border-l-[8px] border-l-transparent z-20 pointer-events-none" />
            )}

            {isInteractive && !!ficha?.EstatusManualAbrev && (
                <>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'top'); }} className="absolute top-0 left-0 w-full h-4 bg-black/10 opacity-0 hover:opacity-100 cursor-ns-resize rounded-t-md" />
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'bottom'); }} className="absolute bottom-0 left-0 w-full h-4 bg-black/10 opacity-0 hover:opacity-100 cursor-ns-resize rounded-b-md" />
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'left'); }} className="absolute left-0 top-0 h-full w-4 bg-black/10 opacity-0 hover:opacity-100 cursor-ew-resize rounded-l-md" />
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'right'); }} className="absolute right-0 top-0 h-full w-4 bg-black/10 opacity-0 hover:opacity-100 cursor-ew-resize rounded-r-md" />
                </>
            )}
        </div>
    );

    const tooltipPlacement = 'top';
    const cellWidthClass = viewMode === 'week' ? 'min-w-[6rem]' : 'min-w-[4rem]';

    return (
        <td
            ref={wrapperRef}
            className={`p-1 relative align-middle group status-cell-wrapper z-0 ${cellWidthClass} ${isToday ? 'bg-sky-50/50' : ''}`}
            onMouseEnter={onDragEnter}
            onClick={(e) => e.stopPropagation()}
        >
            <Tooltip text={<FichaTooltip ficha={ficha} isRestDay={isRestDay} statusCatalog={statusCatalog} isOutOfBounds={isOutOfBounds} fechaIngreso={fechaIngreso} fechaBaja={fechaBaja} fecha={fecha} />} placement={tooltipPlacement} offset={32} disabled={isAnyCellOpen}>
                <div className={`w-full h-full ${isOutOfBounds ? 'opacity-60 saturate-50' : ''}`}>
                    <button
                        onClick={handleToggle}
                        disabled={!isInteractive}
                        className={`
                            w-full h-full rounded-lg focus:outline-none focus-visible:ring-0 
                            ${!isInteractive ? 'cursor-default pointer-events-none' : ''}
                        `}
                    >
                        {cellContent}
                    </button>
                </div>
            </Tooltip>
            {isOpen && isInteractive && (
                <StatusSelectorGrid
                    isOpen={isOpen}
                    anchorEl={wrapperRef.current}
                    statusCatalog={statusCatalog}
                    ficha={ficha}
                    fecha={fecha}
                    isRestDay={isRestDay}
                    onStatusChange={onStatusChange}
                    onClose={() => onToggleOpen(null)}
                />
            )}
        </td>
    );
});