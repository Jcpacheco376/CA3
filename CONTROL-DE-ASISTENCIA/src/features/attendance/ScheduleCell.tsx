// src/features/attendance/ScheduleCell.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Tooltip } from '../../components/ui/Tooltip';
import { Check, AlertTriangle } from 'lucide-react';
import { statusColorPalette } from '../../config/theme';

// --- INICIO: Lógica de Colores para Horarios ---
// Se define fuera del componente para que no se recalcule en cada render.
const scheduleColorKeys = ['cyan', 'sky', 'amber', 'emerald', 'violet', 'rose', 'lime'];
const getColorObjectForSchedule = (scheduleId: string) => {
    // Se genera un color consistente basado en el ID del horario.
    const hash = scheduleId.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const colorKey = scheduleColorKeys[Math.abs(hash) % scheduleColorKeys.length];
    return statusColorPalette[colorKey] || statusColorPalette.slate;
};
// --- FIN: Lógica de Colores ---

export const ScheduleCell = ({ 
    cellId,
    isOpen,
    onToggleOpen,
    scheduleData, // { Fecha, HorarioAplicable, EsTemporal, EstatusConflictivo }
    onScheduleChange,
    scheduleCatalog, // [{ horario, nombre, descripcion }]
    isToday,
    canAssign,
    viewMode,
    onDragStart, 
    onDragEnter, 
    isBeingDragged
}: any) => {
    const wrapperRef = useRef<HTMLTableCellElement>(null);
    const [panelStyle, setPanelStyle] = useState({});
    const [panelPlacement, setPanelPlacement] = useState<'top' | 'bottom'>('bottom');

    const scheduleId = scheduleData?.HorarioAplicable || 'DEF';
    const isTemporary = scheduleData?.EsTemporal;

    const colorClasses = isTemporary 
        ? statusColorPalette.sky // Azul para horarios temporales
        : statusColorPalette.slate; // Gris para horarios por defecto

    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const cellRect = wrapperRef.current.getBoundingClientRect();
            const panelHeight = 250; 
            const panelWidth = 256;

            let top = cellRect.bottom + 8;
            let newPlacement: 'top' | 'bottom' = 'bottom';

            if (cellRect.bottom + panelHeight > window.innerHeight && cellRect.top > panelHeight) {
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
        }
    }, [isOpen]);

    const handleSelect = (newScheduleId: string | null) => {
        onScheduleChange(newScheduleId);
        onToggleOpen(null);
    };
    
    const cellContent = (
        <div className={`
            relative w-24 h-16 mx-auto rounded-md font-bold text-lg flex flex-col items-center justify-center p-1 
            transition-all duration-200 group border-b-4
            ${isBeingDragged || isOpen ? 'ring-4 ring-blue-500/50' : ''}
            ${colorClasses.border}
        `}>
             <div className={`w-full h-full rounded-md ${colorClasses.bgText} flex items-center justify-center shadow-inner-sm`}>
                {scheduleId}
            </div>

            {isTemporary && (
                <Tooltip text="Horario temporal asignado">
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"></div>
                </Tooltip>
            )}
            {scheduleData?.EstatusConflictivo && (
                 <Tooltip text={`Conflicto: ya existe una incidencia registrada (${scheduleData.EstatusConflictivo}) para este día.`}>
                    <AlertTriangle size={16} className="absolute bottom-1 left-1 text-orange-500" />
                </Tooltip>
            )}
             {canAssign && (
                <>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(scheduleId === 'DEF' ? null : scheduleId, 'top'); }} className="absolute top-0 left-0 w-full h-4 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-ns-resize rounded-t-md" title="Arrastrar para rellenar (superior)"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(scheduleId === 'DEF' ? null : scheduleId, 'bottom'); }} className="absolute bottom-0 left-0 w-full h-4 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-ns-resize rounded-b-md" title="Arrastrar para rellenar (inferior)"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(scheduleId === 'DEF' ? null : scheduleId, 'left'); }} className="absolute left-0 top-0 h-full w-4 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize rounded-l-md" title="Arrastrar para rellenar (izquierda)"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(scheduleId === 'DEF' ? null : scheduleId, 'right'); }} className="absolute right-0 top-0 h-full w-4 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize rounded-r-md" title="Arrastrar para rellenar (derecha)"/>
                </>
            )}
        </div>
    );

    const schedulePanel = isOpen && canAssign ? ReactDOM.createPortal(
        <div 
            className="fixed bg-white rounded-lg shadow-xl border z-50 p-2 w-64 animate-scale-in"
            style={panelStyle}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="grid grid-cols-3 gap-1">
                <button onClick={() => handleSelect(null)} className="p-1.5 rounded-md text-center group transition-transform hover:scale-105 focus:outline-none focus:ring-2 ring-[--theme-500] bg-slate-100 text-slate-600 relative">
                    {!isTemporary && <Check size={14} className="absolute top-1 right-1 text-black/50" />}
                    <span className="font-bold block text-lg">DEF</span>
                    <span className="text-xs block">Predeterminado</span>
                </button>
                {scheduleCatalog.map((schedule: any) => {
                    const scheduleColor = getColorObjectForSchedule(schedule.horario);
                    return(
                        <button key={schedule.horario} onClick={() => handleSelect(schedule.horario)}
                            className={`p-1.5 rounded-md text-center group transition-transform hover:scale-105 focus:outline-none focus:ring-2 ring-[--theme-500] ${scheduleColor.bgText} relative`}>
                            {isTemporary && scheduleId === schedule.horario && <Check size={14} className="absolute top-1 right-1 text-black/50" />}
                            <span className="font-bold block text-lg">{schedule.horario}</span>
                            <span className="text-xs block truncate" title={schedule.nombre}>{schedule.nombre}</span>
                        </button>
                    )
                })}
            </div>
        </div>,
        document.body
    ) : null;
    
    const cellWidthClass = viewMode === 'week' ? 'min-w-[7rem]' : 'min-w-[5rem]';

    return (
        <td
            ref={wrapperRef}
            className={`p-1 relative align-middle group ${cellWidthClass} ${isToday ? 'bg-sky-50/50' : ''}`}
            onMouseEnter={onDragEnter}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={() => canAssign && onToggleOpen(cellId)}
                className={`w-full h-full rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-0 transform hover:-translate-y-0.5 ${!canAssign && 'cursor-not-allowed'}`}
                disabled={!canAssign}
            >
                {cellContent}
            </button>
            {schedulePanel}
        </td>
    );
};

