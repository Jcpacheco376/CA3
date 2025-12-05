// src/features/attendance/AttendanceCell.tsx
import React, { useState, useEffect, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import { AttendanceStatus, AttendanceStatusCode } from '../../types';
import { Check, CheckCheck, Clock, MessageSquare, Save, Lock, AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip } from '../../components/ui/Tooltip';
import { statusColorPalette } from '../../config/theme';
import { canAssignStatusToDate, getRestrictionMessage } from '../../utils/attendanceValidation';

const getColorClasses = (colorName: string = 'slate') => {
    const palette = statusColorPalette[colorName] || statusColorPalette.slate;
    return {
        bgText: palette.bgText,
        border: palette.border,
        lightBorder: palette.lightBorder,
        pastel: (palette as any).pastel || `bg-${colorName}-50 text-${colorName}-700` 
    };
};

const FichaTooltip = memo(({ ficha, isRestDay, statusCatalog }: { ficha: any, isRestDay: boolean, statusCatalog: AttendanceStatus[] }) => {
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
            {isBlocked && <div className="mb-1 pb-1 border-b border-red-200 text-red-600 font-bold flex items-center gap-1"><Lock size={12}/> Ficha bloqueada</div>}
            {ficha.IncidenciaActivaId && <div className="mb-1 pb-1 border-b border-amber-200 text-amber-600 font-bold flex items-center gap-1"><AlertTriangle size={12}/> Con incidencia activa #{ficha.IncidenciaActivaId}</div>}
            
            {isProcessing && <p className="font-semibold text-amber-600 mb-1">Turno en progreso...</p>}
            
            {isNoSchedule && (
                <div className="mb-1 pb-1 border-b border-orange-200 text-orange-700 font-bold">
                    ⚠️ Sin horario asignado.
                    <div className="font-normal text-slate-500 mt-0.5">Asigne un horario en el planificador para calcular esta ficha.</div>
                </div>
            )}
            
            <p><span className="font-semibold">Checador:</span> {statusCatalog.find(s => s.Abreviatura === ficha.EstatusChecadorAbrev)?.Descripcion || 'N/A'}</p>
            <p><span className="font-semibold">Manual:</span> {statusCatalog.find(s => s.Abreviatura === ficha.EstatusManualAbrev)?.Descripcion || 'Pendiente'}</p>
            
            {ficha.Comentarios && <p className="mt-1 italic text-slate-500">"{ficha.Comentarios}"</p>}
            <hr className="my-1 border-slate-200" />
            <div className="flex items-center gap-2"> <Clock size={14}/> <span>{formatTime(ficha.HoraEntrada)} - {formatTime(ficha.HoraSalida)}</span> </div>
        </div>
    );
});

export const AttendanceCell = memo(({ 
    cellId, isOpen, onToggleOpen, ficha, onStatusChange, isRestDay, 
    onDragStart, onDragEnter, isBeingDragged, isAnyCellOpen, 
    statusCatalog, isToday, viewMode, canAssign,
    fecha
}: any) => {
    const [isJustUpdated, setIsJustUpdated] = useState(false);
    const wrapperRef = useRef<HTMLTableCellElement>(null);
    const [panelStyle, setPanelStyle] = useState({});
    const [panelPlacement, setPanelPlacement] = useState<'top' | 'bottom'>('bottom');
    const [comment, setComment] = useState('');
    const [justSaved, setJustSaved] = useState(false);

    // --- CORRECCIÓN CRÍTICA PARA FICHAS BORRADOR/FUTURAS ---
    // Si la ficha existe pero está en estado BORRADOR y no tiene estatus, es visualmente un "-" (Vacío)
    const isCleanBorrador = ficha?.Estado === 'BORRADOR' && !ficha.EstatusManualAbrev && !ficha.EstatusChecadorAbrev;

    let finalStatus = 'F'; 
    if (isRestDay) finalStatus = 'D';
    else if (ficha?.EstatusManualAbrev) finalStatus = ficha.EstatusManualAbrev;
    else if (ficha?.EstatusChecadorAbrev) finalStatus = ficha.EstatusChecadorAbrev;
    else if (!ficha || isCleanBorrador) finalStatus = '-'; // <--- AQUÍ EL CAMBIO
    
    const currentStatusConfig = statusCatalog.find((s: any) => s.Abreviatura === finalStatus) || (finalStatus === '-' ? { ColorUI: 'slate', Descripcion: 'No generado', PermiteComentario: false } : { ColorUI: 'blue', Descripcion: 'Desconocido', PermiteComentario: true });                      
    const theme = getColorClasses(currentStatusConfig.ColorUI);
    
    const isProcessing = ficha?.Estado === 'EN_PROCESO';
    const isBlocked = ficha?.Estado === 'BLOQUEADO';
    const isNoSchedule = ficha?.Estado === 'SIN_HORARIO';
    const hasActiveIncident = !!ficha?.IncidenciaActivaId;
    
    const needsManualAction = !ficha?.EstatusManualAbrev && !isRestDay;
    // Si es "borrador limpio", no es interactivo para arrastrar, pero sí para clickear y asignar
    const isInteractive = canAssign && !isProcessing && !isBlocked && !isRestDay && !isNoSchedule;

    const prevStatusRef = useRef(ficha?.EstatusManualAbrev);
    useEffect(() => {
        const currentStatus = ficha?.EstatusManualAbrev;
        if (prevStatusRef.current !== currentStatus) {
            if (currentStatus) { setIsJustUpdated(true); setTimeout(() => setIsJustUpdated(false), 300); }
        }
        prevStatusRef.current = currentStatus;
    }, [ficha?.EstatusManualAbrev]);

    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const cellRect = wrapperRef.current.getBoundingClientRect();
            const panelHeight = currentStatusConfig?.PermiteComentario ? 420 : 320;
            let top = cellRect.bottom + 8;
            let newPlacement: 'top' | 'bottom' = 'bottom';
            if (cellRect.bottom + panelHeight > window.innerHeight && cellRect.top > panelHeight + 8) {
                top = cellRect.top - panelHeight - 8;
                newPlacement = 'top';
            }
            
            // Centrado horizontal
            let left = cellRect.left + (cellRect.width / 2) - 192; // 192 es la mitad de w-96 (384px)
            if (left < 10) left = 10;
            if (left + 384 > window.innerWidth) left = window.innerWidth - 394;

            setPanelStyle({ top, left });
            setPanelPlacement(newPlacement);
            setComment(ficha?.Comentarios || '');
        }
    }, [isOpen, ficha, currentStatusConfig]);

    const handleToggleInteraction = (clickedStatus: AttendanceStatusCode) => {
        const currentManual = ficha?.EstatusManualAbrev;
        if (currentManual === clickedStatus) {
            onStatusChange(null, null); 
        } else {
            const selectedStatusConfig = statusCatalog.find((s: AttendanceStatus) => s.Abreviatura === clickedStatus);
            onStatusChange(clickedStatus, selectedStatusConfig?.PermiteComentario ? comment : undefined);
        }
    };

    const handleSaveComment = () => { onStatusChange(finalStatus, comment); setJustSaved(true); setTimeout(() => setJustSaved(false), 1500); };
    const handleToggle = () => { if (!isInteractive) return; onToggleOpen(cellId); };

    const bgClass = needsManualAction && !isProcessing && !isBlocked ? theme.pastel : theme.bgText; 
    let borderClass = needsManualAction && !isProcessing && !isBlocked ? `border-2 border-dashed ${theme.lightBorder}` : `border-b-4 ${theme.border}`;
    if (isNoSchedule) borderClass = `border-2 border-dashed border-amber-300`;

    const cellContent = (
        <div className={`relative w-24 h-16 mx-auto rounded-md font-bold text-lg flex items-center justify-center transition-all duration-200 group ${isBeingDragged || isOpen ? 'ring-4 ring-blue-500/50' : ''} ${isBlocked ? 'opacity-90 cursor-not-allowed' : ''} ${isInteractive ? 'hover:-translate-y-0.5 shadow-sm' : ''} ${isJustUpdated ? 'animate-drop-in' : ''} ${borderClass}`}>
            <div className={`w-full h-full rounded-md ${bgClass} ${!isInteractive ? 'bg-opacity-70' : 'bg-opacity-90'} flex items-center justify-center shadow-inner-sm`}>
                {isNoSchedule ? (
                    <div className="flex flex-col items-center justify-center gap-0.5">
                        <AlertTriangle size={22} className="text-amber-500 opacity-90" />
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Sin Horario</span>
                    </div>
                ) : (
                    finalStatus
                )}
            </div>
            {isBlocked && <div className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 border border-red-200 shadow-sm z-10"><Lock size={12} /></div>}
            {hasActiveIncident && <div className="absolute -top-2 -left-2 bg-purple-100 text-purple-600 rounded-full p-1 border border-purple-200 shadow-sm z-10"><AlertTriangle size={12} /></div>}
            {isProcessing && <Tooltip text="Turno en progreso..."><Clock size={16} className="absolute bottom-1 right-1 text-amber-600 animate-pulse" /></Tooltip>}
            {ficha?.Comentarios && <MessageSquare size={14} className="absolute bottom-1 left-1 text-black/40" />}
            
            {isInteractive && !!ficha?.EstatusManualAbrev && (
                <>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'top'); }} className="absolute top-0 left-0 w-full h-4 bg-black/10 opacity-0 hover:opacity-100 cursor-ns-resize rounded-t-md"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'bottom'); }} className="absolute bottom-0 left-0 w-full h-4 bg-black/10 opacity-0 hover:opacity-100 cursor-ns-resize rounded-b-md"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'left'); }} className="absolute left-0 top-0 h-full w-4 bg-black/10 opacity-0 hover:opacity-100 cursor-ew-resize rounded-l-md"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'right'); }} className="absolute right-0 top-0 h-full w-4 bg-black/10 opacity-0 hover:opacity-100 cursor-ew-resize rounded-r-md"/>
                </>
            )}
        </div>
    );

    // Panel Flotante
    const statusPanel = isOpen && isInteractive ? ReactDOM.createPortal(
        <div className="fixed bg-white rounded-lg shadow-xl border z-50 p-2 w-64 animate-scale-in" style={panelStyle} onMouseDown={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-1">
                {statusCatalog.filter((status: AttendanceStatus) => status.VisibleSupervisor || status.Abreviatura === ficha?.EstatusChecadorAbrev).map((status: AttendanceStatus) => {
                        const themeBtn = getColorClasses(status.ColorUI);
                        const isStatusAllowed = fecha ? canAssignStatusToDate(status, fecha) : true;
                        const isSelected = ficha?.EstatusManualAbrev === status.Abreviatura;
                        const isSuggested = status.Abreviatura === ficha?.EstatusChecadorAbrev;
                        return (
                            <Tooltip key={status.EstatusId} text={isSelected ? "Click para DESHACER (Volver a Borrador)" : (fecha ? getRestrictionMessage(status, fecha) || status.Descripcion : status.Descripcion)} placement="top" offset={8} zIndex={100}>
                                <div className="h-full">
                                    <button 
                                        onClick={() => {
                                            if (!isStatusAllowed) return;
                                            handleToggleInteraction(status.Abreviatura as AttendanceStatusCode);
                                        }} 
                                        className={`
                                            w-full h-full min-h-[3.5rem] p-1.5 rounded-md text-center group transition-transform hover:scale-105 focus:outline-none focus:ring-2 ring-[--theme-500] relative overflow-hidden
                                            ${themeBtn.bgText} 
                                            ${!isStatusAllowed ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'} 
                                            ${isSelected ? 'ring-2 ring-offset-1 ring-[--theme-500]' : ''}
                                        `}
                                    >
                                        <div className="relative z-10">
                                            {isSelected && isSuggested ? (
                                                <Tooltip text="Sugerido y Confirmado" zIndex={101}><CheckCheck size={16} className="absolute top-1 right-1 text-emerald-600" /></Tooltip>
                                            ) : isSelected ? (
                                                <Tooltip text="Confirmado Manualmente" zIndex={101}><Check size={16} className="absolute top-1 right-1 text-blue-600" /></Tooltip>
                                            ) : isSuggested ? (
                                                <Tooltip text="Sugerido por Checador" zIndex={101}><Check size={16} className="absolute top-1 right-1 text-slate-500" /></Tooltip>
                                            ) : null}
                                            <span className="font-bold block text-lg">{status.Abreviatura}</span>
                                            <span className="text-xs block leading-tight">{status.Descripcion}</span>
                                        </div>

                                        {isSelected && (
                                            <div className="absolute inset-0 bg-red-500 flex flex-col items-center justify-center text-white 
                                                            translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-20">
                                                <X size={18} strokeWidth={3} />
                                                <span className="text-[10px] font-bold uppercase mt-0.5">DESHACER</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </Tooltip>
                        )
                    })}
            </div>
            {currentStatusConfig?.PermiteComentario && (
                <div className="mt-2 pt-2 border-t col-span-3">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-medium text-slate-600">Comentarios</label>
                        <Tooltip text="Guardar Comentario" placement="top" offset={8} zIndex={60}>
                            <button onClick={handleSaveComment} disabled={justSaved} className={`p-1 rounded-md transition-all duration-200 ${justSaved ? 'bg-green-100 text-green-600' : 'text-slate-400 hover:bg-slate-200 hover:text-[--theme-500]'}`}>
                                {justSaved ? <Check size={18} /> : <Save size={18} />}
                            </button>
                        </Tooltip>
                    </div>
                    <textarea className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-[--theme-500] focus:outline-none" placeholder="Agregar una nota..." value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
                </div>
            )}
        </div>, document.body) : null;

    const tooltipPlacement = panelPlacement === 'top' ? 'left' : 'top';
    const cellWidthClass = viewMode === 'week' ? 'min-w-[6rem]' : 'min-w-[4rem]';

    return (
        <td
            ref={wrapperRef}
            className={`p-1 relative align-middle group status-cell-wrapper ${cellWidthClass} ${isToday ? 'bg-sky-50/50' : ''}`} 
            onMouseEnter={onDragEnter}
            onClick={(e) => e.stopPropagation()}
        >
            <Tooltip text={<FichaTooltip ficha={ficha} isRestDay={isRestDay} statusCatalog={statusCatalog} />} placement={tooltipPlacement} offset={32} disabled={isAnyCellOpen}>
                <div className="w-full h-full">
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
            {statusPanel}
        </td>
    );
});