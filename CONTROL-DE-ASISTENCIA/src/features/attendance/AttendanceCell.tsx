// src/features/attendance/AttendanceCell.tsx
import React, { useState, useEffect, useRef, memo } from 'react'; // 'memo' ya estaba, excelente.
import ReactDOM from 'react-dom';
import { AttendanceStatus, AttendanceStatusCode } from '../../types';
import { Check, Clock, AlertTriangle, BadgeCheck, MessageSquare, Save } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip } from '../../components/ui/Tooltip';
import { statusColorPalette } from '../../config/theme';

// --- OPTIMIZACIÓN: Función Helper movida fuera del componente ---
const getColorClasses = (colorName: string = 'red') => {
    // Esta función genera clases de Tailwind JIT (Just-in-Time).
    // Es seguro moverla aquí.
    return {
        bgText: `bg-${colorName}-100 text-${colorName}-800`,
        border: `border-${colorName}-700`,
        lightBorder: `border-${colorName}-400`,
    };
};

// --- OPTIMIZACIÓN: Componente Tooltip envuelto en 'memo' ---
const FichaTooltip = memo(({ ficha, isRestDay, statusCatalog }: { ficha: any, isRestDay: boolean, statusCatalog: AttendanceStatus[] }) => {
    if (isRestDay) return <span>Día de descanso.</span>;
    if (!ficha) return <span>Sin registro del checador para este día.</span>;

    const formatTime = (dateString: string) => {
        if (!dateString) return '--:--';
        return format(new Date(dateString), 'HH:mm');
    };

    return (
        <div className="text-left text-xs p-1">
            {ficha.ProcesamientoAbierto && <p className="font-semibold text-amber-600 mb-1">Turno en progreso...</p>}
            <p><span className="font-semibold">Checador:</span> {statusCatalog.find(s => s.Abreviatura === ficha.EstatusChecadorAbrev)?.Descripcion || 'N/A'}</p>
            <p><span className="font-semibold">Supervisor:</span> {statusCatalog.find(s => s.Abreviatura === ficha.EstatusSupervisorAbrev)?.Descripcion || 'Pendiente'}</p>
            {ficha.Comentarios && <p className="mt-1 italic text-slate-500">"{ficha.Comentarios}"</p>}
            <hr className="my-1 border-slate-200" />
            <div className="flex items-center gap-2"> <Clock size={14}/> <span>{formatTime(ficha.HoraEntrada)} - {formatTime(ficha.HoraSalida)}</span> </div>
            {ficha.EstatusAutorizacion === 'Autorizado' && <p className="text-green-600 font-semibold mt-1">Autorizado por RH</p>}
        </div>
    );
});

export const AttendanceCell = memo(({ 
    cellId, 
    isOpen, 
    onToggleOpen, 
    ficha, 
    onStatusChange,
    isRestDay, 
    onDragStart, 
    onDragEnter, 
    isBeingDragged,
    isAnyCellOpen, 
    statusCatalog,
    isToday,
    viewMode
}: any) => {
    const [isJustUpdated, setIsJustUpdated] = useState(false);
    const wrapperRef = useRef<HTMLTableCellElement>(null);
    const [panelStyle, setPanelStyle] = useState({});
    const [panelPlacement, setPanelPlacement] = useState<'top' | 'bottom'>('bottom');
    const [comment, setComment] = useState('');
    const [justSaved, setJustSaved] = useState(false);

    const finalStatus = isRestDay ? 'D' : ficha?.EstatusSupervisorAbrev || ficha?.EstatusChecadorAbrev || 'F';
    const currentStatusConfig = statusCatalog.find((s: AttendanceStatus) => s.Abreviatura === finalStatus) || 
                                (finalStatus === 'D' ? { ColorUI: 'slate', Descripcion: 'Día de Descanso', PermiteComentario: false } : { ColorUI: 'blue', Descripcion: 'Desconocido', PermiteComentario: true });
                          
    const colorClasses = statusColorPalette[currentStatusConfig.ColorUI as keyof typeof statusColorPalette] || statusColorPalette.slate;
    
    const needsSupervisorAction = !ficha?.EstatusSupervisorAbrev && !isRestDay;
    const isAuthorized = ficha?.EstatusAutorizacion === 'Autorizado';
    const isProcessing = ficha?.ProcesamientoAbierto;

    // Lógica de animación (ya estaba optimizada)
    const prevStatusRef = useRef(ficha?.EstatusSupervisorAbrev);
    useEffect(() => {
        const currentStatus = ficha?.EstatusSupervisorAbrev;
        if (prevStatusRef.current !== currentStatus) {
            if (currentStatus) {
                setIsJustUpdated(true);
                const timer = setTimeout(() => setIsJustUpdated(false), 300);
                return () => clearTimeout(timer);
            }
        }
        prevStatusRef.current = currentStatus;
    }, [ficha?.EstatusSupervisorAbrev]);


    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const cellRect = wrapperRef.current.getBoundingClientRect();
            const panelWidth = 256;
            const panelHeight = currentStatusConfig?.PermiteComentario ? 320 : 200;
        
            let top = cellRect.bottom + 8;
            let newPlacement: 'top' | 'bottom' = 'bottom';

            if (cellRect.bottom + panelHeight > window.innerHeight && cellRect.top > panelHeight + 8) {
                top = cellRect.top - panelHeight - 8;
                newPlacement = 'top';
            }

            let left = cellRect.left + cellRect.width / 2 - panelWidth / 2;
            if (left < 8) left = 8;
            if (left + panelWidth > window.innerWidth - 8) {
                left = window.innerWidth - panelWidth - 8;
            }

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
        if (isProcessing || isAuthorized) return;
        onToggleOpen(cellId);
    };

    const cellContent = (
        <div className={`
            relative w-24 h-16 mx-auto rounded-md font-bold text-lg flex items-center justify-center 
            transition-all duration-200 group
            ${isBeingDragged || isOpen ? 'ring-4 ring-blue-500/50' : ''}
            ${isAuthorized ? 'opacity-70' : ''}
            ${isProcessing ? '' : 'hover:-translate-y-0.5'}
            ${isJustUpdated ? 'animate-drop-in' : ''}
            ${needsSupervisorAction && !isProcessing
                ? `border-2 border-dashed ${colorClasses.lightBorder}`
                : `border-b-4 ${colorClasses.border}`
            }
        `}>
            <div className={`w-full h-full rounded-md ${colorClasses.bgText} ${needsSupervisorAction && !isProcessing ? 'bg-opacity-40' : 'bg-opacity-90'} flex items-center justify-center shadow-inner-sm`}>
                {finalStatus}
            </div>
            
            {isProcessing && (
                <Tooltip text="Turno en progreso. El estatus final se calculará al registrar la salida.">
                    <Clock size={16} className="absolute bottom-1 right-1 text-amber-600 animate-pulse" />
                </Tooltip>
            )}

            {isAuthorized && <BadgeCheck size={18} className="absolute top-1 right-1 text-white bg-green-600 rounded-full p-0.5" />}
            {ficha?.Comentarios && <MessageSquare size={14} className="absolute bottom-1 left-1 text-black/40" title={ficha.Comentarios} />}
            {ficha && ficha.EstatusChecadorAbrev === 'SES' && !isProcessing && <AlertTriangle size={16} className="absolute bottom-1 right-1 text-black/40" title="E/S Incompleta" />}
            
            {!isRestDay && !isAuthorized && !isProcessing && !!ficha?.EstatusSupervisorAbrev && (
                <>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'top'); }} className="absolute top-0 left-0 w-full h-4 bg-black/10 opacity-0 hover:opacity-100 transition-opacity cursor-ns-resize rounded-t-md" title="Arrastrar para rellenar (superior)"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'bottom'); }} className="absolute bottom-0 left-0 w-full h-4 bg-black/10 opacity-0 hover:opacity-100 transition-opacity cursor-ns-resize rounded-b-md" title="Arrastrar para rellenar (inferior)"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'left'); }} className="absolute left-0 top-0 h-full w-4 bg-black/10 opacity-0 hover:opacity-100 transition-opacity cursor-ew-resize rounded-l-md" title="Arrastrar para rellenar (izquierda)"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(finalStatus, 'right'); }} className="absolute right-0 top-0 h-full w-4 bg-black/10 opacity-0 hover:opacity-100 transition-opacity cursor-ew-resize rounded-r-md" title="Arrastrar para rellenar (derecha)"/>
                </>
            )}
        </div>
    );

    const statusPanel = isOpen && !isProcessing && !isAuthorized ? ReactDOM.createPortal(
        <div 
            className="fixed bg-white rounded-lg shadow-xl border z-50 p-2 w-64 animate-scale-in"
            style={panelStyle}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="grid grid-cols-3 gap-1">
                {statusCatalog
                    .filter((status: AttendanceStatus) => status.VisibleSupervisor)
                    .map((status: AttendanceStatus) => {
                        const { bgText: statusColor } = getColorClasses(status.ColorUI); // Usa la función helper
                        return (
                            <button key={status.EstatusId} onClick={() => handleSelect(status.Abreviatura as AttendanceStatusCode)}
                                className={`p-1.5 rounded-md text-center group transition-transform hover:scale-105 focus:outline-none focus:ring-2 ring-[--theme-500] ${statusColor} relative`}>
                                {finalStatus === status.Abreviatura && <Check size={14} className="absolute top-1 right-1 text-black/50" />}
                                <span className="font-bold block text-lg">{status.Abreviatura}</span>
                                <span className="text-xs block">{status.Descripcion}</span>
                            </button>
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

    const wrapperContent = (
        <button
            onClick={handleToggle}
            className={`w-full h-full rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-0`}
        >
            {cellContent}
        </button>
    );
    
    // El ancho mínimo lo controla el <th> en el padre (6rem o 4rem)
    const cellWidthClass = viewMode === 'week' ? 'min-w-[6rem]' : 'min-w-[4rem]';

    return (
        <td
            ref={wrapperRef}
            className={`p-1 relative align-middle group status-cell-wrapper ${cellWidthClass} ${isToday ? 'bg-sky-50/50' : ''}`} 
            onMouseEnter={onDragEnter}
            onClick={(e) => e.stopPropagation()}
        >
            <Tooltip text={<FichaTooltip ficha={ficha} isRestDay={isRestDay} statusCatalog={statusCatalog} />} placement={tooltipPlacement} offset={32} disabled={isAnyCellOpen}>
                {wrapperContent}
            </Tooltip>
            {statusPanel}
        </td>
    );
});