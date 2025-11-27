// src/features/attendance/AttendanceCell.tsx
import React, { useState, useEffect, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import { AttendanceStatus, AttendanceStatusCode } from '../../types';
import { Check, Clock, MessageSquare, Save, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip } from '../../components/ui/Tooltip';
import { statusColorPalette } from '../../config/theme';
import { canAssignStatusToDate, getRestrictionMessage } from '../../utils/attendanceValidation';

// Helper de colores robusto
const getColorClasses = (colorName: string = 'slate') => {
    const palette = statusColorPalette[colorName] || statusColorPalette.slate;
    return {
        bgText: palette.bgText,
        border: palette.border,
        lightBorder: palette.lightBorder,
        // Fallback seguro para pastel si no existe en el tema
        pastel: (palette as any).pastel || `bg-${colorName}-50 text-${colorName}-700` 
    };
};

const FichaTooltip = memo(({ ficha, isRestDay, statusCatalog }: { ficha: any, isRestDay: boolean, statusCatalog: AttendanceStatus[] }) => {
    if (isRestDay) return <span>Día de descanso.</span>;
    if (!ficha) return <span>Sin registro del checador para este día.</span>;

    const formatTime = (dateString: string) => {
        if (!dateString) return '--:--';
        return format(new Date(dateString), 'HH:mm');
    };

    return (
        <div className="text-left text-xs p-1">
            {ficha.IncidenciaActivaId && (
                <div className="mb-1 pb-1 border-b border-red-200 text-red-600 font-bold flex items-center gap-1">
                    <Lock size={12}/> Bloqueado por Incidencia #{ficha.IncidenciaActivaId}
                </div>
            )}
            
            {ficha.ProcesamientoAbierto && <p className="font-semibold text-amber-600 mb-1">Turno en progreso...</p>}
            
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

    // 1. Determinar Estatus Visual
    // Prioridad: Descanso > Manual > Checador > Falta Default
   let finalStatus = 'F'; // Default peligroso
    if (isRestDay) {
        finalStatus = 'D';
    } else if (ficha?.EstatusManualAbrev) {
        finalStatus = ficha.EstatusManualAbrev;
    } else if (ficha?.EstatusChecadorAbrev) {
        finalStatus = ficha.EstatusChecadorAbrev;
    } else if (!ficha) {
        // Si no existe objeto ficha, es un día no procesado (Futuro)
        finalStatus = '-';
    }
    
    const currentStatusConfig = statusCatalog.find((s: any) => s.Abreviatura === finalStatus) ||
                                (finalStatus === '-'
                                    ? { ColorUI: 'slate', Descripcion: 'No generado', PermiteComentario: false }
                                    : { ColorUI: 'blue', Descripcion: 'Desconocido', PermiteComentario: true });                      
    const theme = getColorClasses(currentStatusConfig.ColorUI);
    
    // 2. Lógica de Bloqueo e Interactividad
    const isProcessing = ficha?.ProcesamientoAbierto;
    const isLockedByIncident = !!ficha?.IncidenciaActivaId;
    
    // Detectar si es una sugerencia automática pendiente de confirmación
    const needsManualAction = !ficha?.EstatusManualAbrev && !isRestDay;

    const isInteractive = canAssign && !isProcessing && !isLockedByIncident && !isRestDay;

    // 3. Animación al cambiar estatus manual
    const prevStatusRef = useRef(ficha?.EstatusManualAbrev);
    useEffect(() => {
        const currentStatus = ficha?.EstatusManualAbrev;
        if (prevStatusRef.current !== currentStatus) {
            if (currentStatus) {
                setIsJustUpdated(true);
                const timer = setTimeout(() => setIsJustUpdated(false), 300);
                return () => clearTimeout(timer);
            }
        }
        prevStatusRef.current = currentStatus;
    }, [ficha?.EstatusManualAbrev]);

    // 4. Posicionamiento del Popover
    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const cellRect = wrapperRef.current.getBoundingClientRect();
            // const panelWidth = 256; 
            const panelHeight = currentStatusConfig?.PermiteComentario ? 320 : 200;
        
            let top = cellRect.bottom + 8;
            let newPlacement: 'top' | 'bottom' = 'bottom';

            if (cellRect.bottom + panelHeight > window.innerHeight && cellRect.top > panelHeight + 8) {
                top = cellRect.top - panelHeight - 8;
                newPlacement = 'top';
            }

            let left = cellRect.left; // Ajustar si se sale horizontalmente

            setPanelStyle({ top, left });
            setPanelPlacement(newPlacement);
            setComment(ficha?.Comentarios || '');
        }
    }, [isOpen, ficha, currentStatusConfig]);

    const handleSelect = (newStatus: AttendanceStatusCode) => {
        const selectedStatusConfig = statusCatalog.find((s: AttendanceStatus) => s.Abreviatura === newStatus);
        const commentToSend = selectedStatusConfig?.PermiteComentario ? comment : undefined;
        onStatusChange(newStatus, commentToSend);
    };
    
    const handleSaveComment = () => {
        onStatusChange(finalStatus, comment);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
    };

    const handleToggle = () => {
        if (!isInteractive) return;
        onToggleOpen(cellId);
    };

    // 5. Estilos Dinámicos (Pastel vs Sólido)
    const bgClass = needsManualAction && !isProcessing && !isLockedByIncident 
        ? theme.pastel 
        : theme.bgText; 
    
    const borderClass = needsManualAction && !isProcessing && !isLockedByIncident
        ? `border-2 border-dashed ${theme.lightBorder}` 
        : `border-b-4 ${theme.border}`;

    // 6. Contenido Visual
    const cellContent = (
        <div className={`
            relative w-24 h-16 mx-auto rounded-md font-bold text-lg flex items-center justify-center 
            transition-all duration-200 group
            ${isBeingDragged || isOpen ? 'ring-4 ring-blue-500/50' : ''}
            ${isLockedByIncident ? 'opacity-90 cursor-not-allowed' : ''} 
            ${isInteractive ? 'hover:-translate-y-0.5 shadow-sm' : ''}
            ${isJustUpdated ? 'animate-drop-in' : ''}
            ${borderClass}
        `}>
            <div className={`w-full h-full rounded-md ${bgClass} ${!isInteractive ? 'bg-opacity-70' : 'bg-opacity-90'} flex items-center justify-center shadow-inner-sm`}>
                {finalStatus}
            </div>
            
            {isLockedByIncident && (
                <div className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 border border-red-200 shadow-sm z-10">
                    <Lock size={12} />
                </div>
            )}

            {isProcessing && (
                <Tooltip text="Turno en progreso...">
                    <Clock size={16} className="absolute bottom-1 right-1 text-amber-600 animate-pulse" />
                </Tooltip>
            )}

            {ficha?.Comentarios && <MessageSquare size={14} className="absolute bottom-1 left-1 text-black/40" />}
            
            {/* Arrastre solo si ya está confirmado manualmente */}
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
        <div 
            className="fixed bg-white rounded-lg shadow-xl border z-50 p-2 w-64 animate-scale-in"
            style={panelStyle}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="grid grid-cols-3 gap-1">
                {statusCatalog
                    .filter((status: AttendanceStatus) => status.VisibleSupervisor)
                    .map((status: AttendanceStatus) => {
                        const themeBtn = getColorClasses(status.ColorUI);
                        const isStatusAllowed = fecha ? canAssignStatusToDate(status, fecha) : true;
                        const restrictionMsg = fecha ? getRestrictionMessage(status, fecha) : '';
                        
                        return (
                            <Tooltip 
                                key={status.EstatusId}
                                text={restrictionMsg || status.Descripcion}
                                placement="top"
                                offset={8}
                            >
                                <div className="h-full">
                                    <button 
                                        onClick={() => isStatusAllowed && handleSelect(status.Abreviatura as AttendanceStatusCode)}
                                        className={`w-full h-full p-1.5 rounded-md text-center group transition-transform hover:scale-105 focus:outline-none focus:ring-2 ring-[--theme-500] ${themeBtn.bgText} ${!isStatusAllowed ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'} relative`}
                                    >
                                        {finalStatus === status.Abreviatura && <Check size={14} className="absolute top-1 right-1 text-black/50" />}
                                        <span className="font-bold block text-lg">{status.Abreviatura}</span>
                                        <span className="text-xs block">{status.Descripcion}</span>
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
                            <button 
                                onClick={handleSaveComment}
                                disabled={justSaved}
                                className={`p-1 rounded-md transition-all duration-200 ${justSaved ? 'bg-green-100 text-green-600' : 'text-slate-400 hover:bg-slate-200 hover:text-[--theme-500]'}`}
                            >
                                {justSaved ? <Check size={18} /> : <Save size={18} />}
                            </button>
                        </Tooltip>
                    </div>
                    <textarea
                        className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-[--theme-500] focus:outline-none"
                        placeholder="Agregar una nota..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                    />
                </div>
            )}
        </div>,
        document.body
    ) : null;

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
                <button
                    onClick={handleToggle}
                    disabled={!isInteractive}
                    className={`w-full h-full rounded-lg focus:outline-none focus-visible:ring-0 ${!isInteractive ? 'cursor-default' : ''}`}
                >
                    {cellContent}
                </button>
            </Tooltip>
            {statusPanel}
        </td>
    );
});