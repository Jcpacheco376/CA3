// src/features/attendance/ScheduleCell.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Tooltip } from '../../components/ui/Tooltip';
import { Check, AlertTriangle } from 'lucide-react';
import { themes } from '../../config/theme';

// --- COMPONENTE PRINCIPAL ---

export const ScheduleCell = ({ 
    cellId,
    isOpen,
    onToggleOpen,
    scheduleData, // { Fecha, HorarioAplicable, EsTemporal, EstatusConflictivo }
    onScheduleChange,
    scheduleCatalog, // [{ HorarioId, Abreviatura, Nombre, ColorUI }]
    isToday,
    canAssign,
    viewMode,
    onDragStart, 
    onDragEnter, 
    isBeingDragged
}: any) => {
    const wrapperRef = useRef<HTMLTableCellElement>(null);
    const [panelStyle, setPanelStyle] = useState({});

    // --- LÓGICA DE DATOS Y ESTADO ---
    const scheduleId = scheduleData?.HorarioAplicable || 'DEF';
    const isTemporary = scheduleData?.EsTemporal;
    const isConflict = !!scheduleData?.EstatusConflictivo;

    // --- LÓGICA DE COLORES ---
    const currentScheduleConfig = scheduleCatalog.find((s: any) => s.Abreviatura === scheduleId);
    const colorName = isTemporary ? 'sky' : currentScheduleConfig?.ColorUI || 'slate';
    const themeColors = themes[colorName as keyof typeof themes] || themes.slate;
    
    const colorStyles = {
        bgText: {
            backgroundColor: themeColors[100],
            color: themeColors[800],
        },
        border: {
            borderColor: themeColors[400],
        }
    };

    // --- MANEJADORES DE EVENTOS ---
    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const cellRect = wrapperRef.current.getBoundingClientRect();
            const panelHeight = 250; 
            const panelWidth = 256;
            let top = cellRect.bottom + 8;
            if (cellRect.bottom + panelHeight > window.innerHeight && cellRect.top > panelHeight) {
                top = cellRect.top - panelHeight - 8;
            }
            let left = cellRect.left + cellRect.width / 2 - panelWidth / 2;
            if (left < 8) left = 8;
            if (left + panelWidth > window.innerWidth - 8) {
                left = window.innerWidth - panelWidth - 8;
            }
            setPanelStyle({ top, left });
        }
    }, [isOpen]);

    const handleSelect = (newScheduleId: string | null) => {
        onScheduleChange(newScheduleId);
        onToggleOpen(null);
    };

    const handleToggle = () => {
        if (isConflict || !canAssign) return; // Permite el clic, pero no hace nada
        onToggleOpen(cellId);
    };
    
    // --- RENDERIZADO DE COMPONENTES ---

    const cellContent = (
        <div className={`
            relative w-24 h-16 mx-auto rounded-md font-bold text-lg flex items-center justify-center
            transition-all duration-200 group border-b-4
            ${isBeingDragged || isOpen ? 'ring-4 ring-blue-500/50' : ''}
            ${isConflict ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-0.5'}
        `} style={colorStyles.border}>
            <div className="w-full h-full rounded-md flex items-center justify-center shadow-inner-sm" style={colorStyles.bgText}>
                {scheduleId}
            </div>

            {isTemporary && (
                <Tooltip text="Horario temporal asignado">
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"></div>
                </Tooltip>
            )}
            {isConflict && (
                <Tooltip text={`Conflicto: ya existe una incidencia registrada (${scheduleData.EstatusConflictivo}) para este día.`}>
                    <AlertTriangle size={16} className="absolute bottom-1 left-1 text-orange-500" />
                </Tooltip>
            )}
            {canAssign && !isConflict && (
                <>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(scheduleId === 'DEF' ? null : scheduleId); }} className="absolute top-0 left-0 w-full h-4 bg-black/10 opacity-0 hover:opacity-100 transition-opacity cursor-ns-resize rounded-t-md" title="Arrastrar para rellenar (superior)"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(scheduleId === 'DEF' ? null : scheduleId); }} className="absolute bottom-0 left-0 w-full h-4 bg-black/10 opacity-0 hover:opacity-100 transition-opacity cursor-ns-resize rounded-b-md" title="Arrastrar para rellenar (inferior)"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(scheduleId === 'DEF' ? null : scheduleId); }} className="absolute left-0 top-0 h-full w-4 bg-black/10 opacity-0 hover:opacity-100 transition-opacity cursor-ew-resize rounded-l-md" title="Arrastrar para rellenar (izquierda)"/>
                    <div onMouseDown={(e) => { e.stopPropagation(); onDragStart(scheduleId === 'DEF' ? null : scheduleId); }} className="absolute right-0 top-0 h-full w-4 bg-black/10 opacity-0 hover:opacity-100 transition-opacity cursor-ew-resize rounded-r-md" title="Arrastrar para rellenar (derecha)"/>
                </>
            )}
        </div>
    );

    const schedulePanel = isOpen && canAssign && !isConflict ? ReactDOM.createPortal(
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
                    const colorName = schedule.ColorUI || 'slate';
                    const themeColor = themes[colorName as keyof typeof themes] || themes.slate;
                    return(
                        <button key={schedule.HorarioId} onClick={() => handleSelect(schedule.HorarioId)}
                            className="p-1.5 rounded-md text-center group transition-transform hover:scale-105 focus:outline-none focus:ring-2 ring-[--theme-500] relative"
                            style={{ backgroundColor: themeColor[100], color: themeColor[800] }}
                        >
                            {isTemporary && scheduleId === schedule.Abreviatura && <Check size={14} className="absolute top-1 right-1 text-black/50" />}
                            <span className="font-bold block text-lg">{schedule.Abreviatura}</span>
                            <span className="text-xs block truncate" title={schedule.Nombre}>{schedule.Nombre}</span>
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
                onClick={handleToggle}
                className={`w-full h-full rounded-lg transition-all duration-200 focus:outline-none focus:visible:ring-0`}
                disabled={!canAssign}
            >
                {cellContent}
            </button>
            {schedulePanel}
        </td>
    );
};