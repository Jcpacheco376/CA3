// src/features/attendance/ScheduleCell.tsx
import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import { Tooltip } from '../../components/ui/Tooltip';
import { Sun, Moon, Sunset, Coffee, RotateCw, X, Check, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { themes, statusColorPalette } from '../../config/theme';
import { getDay as getDayOfWeek } from 'date-fns';

// ... (helpers: getTurnoIcon, determineTurnoFromTime, ScheduleTooltipContent, SchedulePreviewCard, ScheduleSelectionPanel... todos se quedan igual) ...
// (Los helpers que ya están envueltos en 'memo' se quedan así)

const getTurnoIcon = (turno: 'M' | 'V' | 'N' | string | null | undefined, size = 14) => {
    switch (turno) {
        case 'M': return <Sun size={size} className="text-amber-500 shrink-0" title="Matutino" />;
        case 'V': return <Sunset size={size} className="text-orange-500 shrink-0" title="Vespertino" />;
        case 'N': return <Moon size={size} className="text-indigo-500 shrink-0" title="Nocturno" />;
        default: return null;
    }
};
const determineTurnoFromTime = (horaEntrada: string): 'M' | 'V' | 'N' | null => {
    if (!horaEntrada || horaEntrada === '00:00') return null;
    try {
        const hour = parseInt(horaEntrada.split(':')[0], 10);
        if (hour >= 5 && hour < 12) return 'M';
        if (hour >= 12 && hour < 20) return 'V';
        if ((hour >= 20 && hour <= 23) || (hour >= 0 && hour < 5)) return 'N';
    } catch { return null; }
    return null;
};
const ScheduleTooltipContent = memo(({ details, horario, tipo, scheduleData, isPending }: { details: any, horario: any, tipo: string, scheduleData: any, isPending?: boolean }) => {
    if (isPending) {
        return (
            <div className="p-2 text-xs text-left w-52">
                <p className="font-bold text-white mb-2">⚠️ Requiere Asignación</p>
                <p className="text-amber-100">Este empleado tiene horario rotativo y no tiene un turno asignado para este día. Haz clic para seleccionar uno.</p>
            </div>
        );
    }
    
    let title = "Horario Base";
    let scheduleName = horario?.Nombre || "";
    let hours = "";
    let hasMeal = false;
    let tolerance = horario?.MinutosTolerancia;
    const conflict = scheduleData?.EstatusConflictivo;
    if (tipo === 'descanso') {
        title = scheduleData?.TipoAsignacion === 'D' ? "Descanso (Asignado)" : "Descanso (Horario)";
        scheduleName = "";
        tolerance = undefined;
    } else if (tipo === 'rotativo') {
        title = "Excepción: Turno Rotativo";
        scheduleName = `${horario?.Nombre || 'Rotativo'} (Turno ${details?.DiaSemana || '?'})`;
    } else if (tipo === 'fijo') {
        title = "Excepción: Horario Fijo";
    }
    if (details?.EsDiaLaboral) {
        const entrada = details.HoraEntrada ? details.HoraEntrada.substring(0, 5) : '??:??';
        const salida = details.HoraSalida ? details.HoraSalida.substring(0, 5) : '??:??';
        hours = `${entrada} - ${salida}`;
        hasMeal = details.TieneComida;
    }
    return (
        <div className="p-1.5 text-xs text-left w-52">
            <p className="font-bold text-white mb-1.5">{title}</p>
            {scheduleName && (
                <p className="text-slate-200">{scheduleName} ({horario?.Abreviatura || 'N/A'})</p>
            )}
            {hours && (
                <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-600">
                    <span className="font-semibold text-lg text-white">{hours}</span>
                    {hasMeal ? <Coffee size={14} className="text-amber-200 shrink-0" title="Incluye comida"/> : null}
                </div>
            )}
            {tolerance !== undefined && (
                 <div className="flex items-center gap-1.5 mt-1 text-slate-300">
                    <Clock size={12} className="shrink-0" />
                    <span>Tolerancia: {tolerance} min.</span>
                </div>
            )}
            {conflict && (
                <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-orange-700">
                    <AlertTriangle size={14} className="text-orange-300 shrink-0" />
                    <span className="text-orange-300 font-semibold">{conflict}</span>
                </div>
            )}
        </div>
    );
});
const SchedulePreviewCard = memo(({ details, horario, tipo, isPending }: { details: any, horario: any, tipo: 'fijo' | 'rotativo' | 'descanso' | 'default', isPending?: boolean }) => {
    const colorKey = horario?.ColorUI || 'slate';
    const theme = statusColorPalette[colorKey as keyof typeof statusColorPalette] || statusColorPalette.slate;
    const { bgText, border, pastel, lightBorder } = theme as any;
    const esRotativo = horario?.EsRotativo || tipo === 'rotativo';
    
    let content;
    if (isPending) {
        // Estado pendiente: mostrar triángulo de advertencia
        content = (
            <div className="flex items-center justify-center gap-1 h-full w-full flex-col">
                <AlertTriangle size={24} className="text-amber-500 opacity-75" />
                <span className="text-xs text-slate-500 font-medium">Asignar</span>
            </div>
        );
    } else if (tipo === 'descanso' || !details || !details.EsDiaLaboral) {
        content = <span className="text-sm font-semibold text-slate-600 leading-tight">Descanso</span>;
    } else {
        const entrada = details.HoraEntrada ? details.HoraEntrada.substring(0, 5) : '??:??';
        const salida = details.HoraSalida ? details.HoraSalida.substring(0, 5) : '??:??';
        content = (
            <div className="flex items-center justify-center gap-2 h-full px-2 py-1 w-full">
                <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-[16px] font-semibold leading-tight block w-full text-center">{entrada}</span>
                    <span className="text-[10px] leading-tight text-slate-500 block w-full text-center">-</span>
                    <span className="text-[16px] font-semibold leading-tight block w-full text-center">{salida}</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1.5 pl-2">
                    {getTurnoIcon(determineTurnoFromTime(details.HoraEntrada))}
                    {details?.TieneComida ? <Coffee size={14} className="text-amber-700 shrink-0" title="Incluye comida" /> : null}
                </div>
            </div>
        );
    }
    
    // Seleccionar estilos: pastel punteado si está pendiente, sólido si no
    const borderClass = isPending 
        ? `border-2 border-dashed ${lightBorder}` 
        : `border-b-4 ${border}`;
    const bgClass = isPending ? pastel : bgText;
    
    return (
        <div className={`relative w-24 h-16 mx-auto rounded-md font-bold flex items-center justify-center transition-all duration-200 ${borderClass}`}>
            {esRotativo && tipo !== 'rotativo' && !isPending && (
                <div className="absolute top-1 right-1 text-slate-500 opacity-70">
                    <RotateCw size={10} title="Horario Rotativo"/>
                </div>
            )}
            <div className={`w-full h-full rounded-md ${bgClass} ${!isPending ? 'bg-opacity-90' : 'bg-opacity-60'} flex items-center justify-center shadow-inner-sm overflow-hidden`}>
                {content}
            </div>
        </div>
    );
});
const ScheduleSelectionPanel = memo(({
    isOpen,
    panelStyle,
    allRotativoTurns,
    onSelect,
    onClose,
    currentSelection
}: {
    isOpen: boolean,
    panelStyle: React.CSSProperties,
    allRotativoTurns: any[],
    onSelect: (payload: any) => void,
    onClose: () => void,
    currentSelection: { tipo: string, id: number | null }
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
     }, [isOpen, onClose]);
    if (!isOpen) return null;
    const isBaseSelected = currentSelection.tipo === 'default';
    const isDescansoSelected = currentSelection.tipo === 'D';
    return ReactDOM.createPortal(
        <div
            ref={panelRef}
            className="fixed bg-white rounded-xl shadow-2xl border p-4 w-96 animate-scale-in z-[100]"
            style={panelStyle}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <button onClick={onClose} className="absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X size={18} />
            </button>
            <h4 className="text-base font-semibold text-slate-800 mb-3">Asignar Turno para este Día</h4>
            {allRotativoTurns.length > 0 ? (
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1 mb-3">
                    {allRotativoTurns.map(({ horario, turno }) => {
                         const entrada = turno.HoraEntrada ? turno.HoraEntrada.substring(0, 5) : '??:??';
                         const salida = turno.HoraSalida ? turno.HoraSalida.substring(0, 5) : '??:??';
                         const turnoLabel = `Turno ${turno.DiaSemana}`;
                         const colorKey = horario?.ColorUI || 'slate';
                         const theme = statusColorPalette[colorKey as keyof typeof statusColorPalette] || statusColorPalette.slate;
                         const isSelected = currentSelection.tipo === 'T' && currentSelection.id === turno.HorarioDetalleId;
                        return (
                            <button
                                key={turno.HorarioDetalleId}
                                onClick={() => onSelect({
                                    tipoAsignacion: 'T',
                                    detalleId: turno.HorarioDetalleId
                                })}
                                className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-all border
                                    ${isSelected 
                                        ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300' 
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }
                                `}
                                title={`${horario.Nombre} - ${turnoLabel} (${entrada} - ${salida})`}
                            >
                                <span
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${theme.bgText} bg-opacity-90`}
                                >
                                     {getTurnoIcon(determineTurnoFromTime(turno.HoraEntrada), 16)}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{horario.Nombre}</p>
                                    <p className="text-xs text-slate-500">{turnoLabel}</p>
                                </span>
                                <span className="text-sm font-semibold text-slate-600">{entrada} - {salida}</span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <p className="text-sm text-slate-500 text-center p-4 bg-slate-50 rounded-md mb-3">No hay turnos rotativos definidos.</p>
            )}
            <div className="pt-3 border-t">
                <div className="flex gap-2">
                    <button
                        onClick={() => onSelect({ tipoAsignacion: null })}
                        className={`flex-1 p-2 rounded-md text-center group transition-all
                            ${isBaseSelected
                                ? 'bg-slate-200 border border-slate-400'
                                : 'bg-slate-100 hover:bg-slate-200 border border-transparent'
                            }
                        `}
                    >
                        <span className="font-semibold block text-sm text-slate-700">Usar Base</span>
                    </button>
                    <button
                        onClick={() => onSelect({ tipoAsignacion: 'D' })}
                        className={`flex-1 p-2 rounded-md text-center group transition-all
                            ${isDescansoSelected
                                ? 'bg-rose-200 border border-rose-400'
                                : 'bg-rose-100 hover:bg-rose-200 border border-transparent'
                            }
                        `}
                    >
                        <span className="font-semibold block text-sm text-rose-700">Descanso</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
});


// --- Componente principal ---
export const ScheduleCell = memo(({
    cellId,
    day,
    isOpen,
    onToggleOpen,
    scheduleData,
    horarioDefaultId,
    onScheduleChange,
    scheduleCatalog,
    isToday,
    canAssign,
    viewMode,
    className,
    isRotativoEmployee
}: any) => {

    const wrapperRef = useRef<HTMLTableCellElement>(null);
    const [panelStyle, setPanelStyle] = useState({});
    const [panelPlacement, setPanelPlacement] = useState<'top' | 'bottom'>('bottom');
    const [isJustUpdated, setIsJustUpdated] = useState(false);
    const prevScheduleDataRef = useRef(scheduleData);

    useEffect(() => {
        if (JSON.stringify(prevScheduleDataRef.current) !== JSON.stringify(scheduleData)) {
            if (scheduleData) { // Animar solo cuando hay una nueva asignación
                setIsJustUpdated(true);
                const timer = setTimeout(() => setIsJustUpdated(false), 300);
                return () => clearTimeout(timer);
            }
        }
        prevScheduleDataRef.current = scheduleData;
    }, [scheduleData]);

    const { displayDetails, displayHorario, displayType } = useMemo(() => {
        let diaSemana = getDayOfWeek(day);
        if (diaSemana === 0) diaSemana = 7;
        let tipo: 'fijo' | 'rotativo' | 'descanso' | 'default' = 'default';
        let horario = null;
        let details = null;

        if (scheduleData?.EstatusConflictivo) {
            tipo = 'descanso';
        } else if (scheduleData?.TipoAsignacion) {
            if (scheduleData.TipoAsignacion === 'H') {
                tipo = 'fijo';
                horario = scheduleCatalog.find((h: any) => h.HorarioId === scheduleData.HorarioIdAplicable);
                if (horario) details = horario?.Turnos?.find((t: any) => t.DiaSemana === diaSemana);
            } else if (scheduleData.TipoAsignacion === 'T') {
                tipo = 'rotativo';
                for (const h of scheduleCatalog) {
                    if (h.EsRotativo && h?.Turnos) {
                        const turno = h.Turnos.find((t: any) => t.HorarioDetalleId === scheduleData.HorarioDetalleIdAplicable);
                        if (turno) { horario = h; details = turno; break; }
                    }
                }
            } else if (scheduleData.TipoAsignacion === 'D') {
                tipo = 'descanso';
            }
        } else if (horarioDefaultId) {
            tipo = 'default';
            horario = scheduleCatalog.find((h: any) => h.HorarioId === horarioDefaultId);
            if (horario) details = horario?.Turnos?.find((t: any) => t.DiaSemana === diaSemana);
        } else {
             tipo = 'descanso';
        }

        if (!details) {
            details = { EsDiaLaboral: false };
            if (tipo !== 'descanso') tipo = 'descanso';
        }

        return { displayDetails: details, displayHorario: horario, displayType: tipo };

    }, [scheduleData, horarioDefaultId, scheduleCatalog, day]);

    // NUEVO: Detectar si es un horario rotativo sin asignación (pendiente)
    const isPendingRotativoAssignment = useMemo(() => {
        return isRotativoEmployee === true && (!scheduleData || scheduleData?.TipoAsignacion === null);
    }, [isRotativoEmployee, scheduleData]);

    const allRotativoTurns = useMemo(() => {
        if (!canAssign) return [];
        const turns: any[] = [];
        scheduleCatalog.forEach((horario: any) => {
            if (horario.EsRotativo && horario?.Turnos) {
                horario.Turnos.forEach((turno: any) => {
                    if (turno.EsDiaLaboral) {
                        turns.push({ horario, turno });
                    }
                });
            }
        });
        return turns;
    }, [scheduleCatalog, canAssign]);


    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const cellRect = wrapperRef.current.getBoundingClientRect();
            const panelHeight = 400; // Aprox
            const panelWidth = 384; // w-96
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


    const handleToggle = () => {
        if (scheduleData?.EstatusConflictivo || !canAssign) return;
        onToggleOpen(cellId);
    };

    const handleSelectInPanel = (payload: any) => {
        onScheduleChange(payload);
        onToggleOpen(null); // Cerrar panel
    };

    const currentSelection = useMemo(() => {
        if (scheduleData?.TipoAsignacion === 'T') {
            return { tipo: 'T', id: scheduleData.HorarioDetalleIdAplicable };
        }
        if (scheduleData?.TipoAsignacion === 'D') {
            return { tipo: 'D', id: null };
        }
        if (scheduleData?.TipoAsignacion === 'H') {
            return { tipo: 'H', id: scheduleData.HorarioIdAplicable };
        }
        return { tipo: 'default', id: null };
    }, [scheduleData]);

    const isConflict = !!scheduleData?.EstatusConflictivo;
    
    // Ancho consistente con AttendanceCell y el thead
    const cellWidthClass = viewMode === 'week' ? 'min-w-[6rem]' : 'min-w-[4rem]';
    
    const tooltipPlacement = panelPlacement === 'top' ? 'left' : 'top';

    const wrapperContent = (
        <button
            onClick={handleToggle}
            className={`w-full h-full rounded-lg transition-all duration-200 focus:outline-none focus:visible:ring-0
                ${isConflict ? 'cursor-not-allowed opacity-70' : ''}
                ${canAssign && !isConflict ? 'hover:scale-105' : 'cursor-default'}
                ${isJustUpdated ? 'animate-drop-in' : ''}
            `} // <-- Clase de animación añadida
            disabled={!canAssign && !isConflict}
        >
            {isConflict ? (
                <SchedulePreviewCard
                    details={displayDetails}
                    horario={displayHorario}
                    tipo={displayType}
                    isPending={isPendingRotativoAssignment}
                />
            ) : (
                // Aplicamos el contorno azul aquí, en el componente que se muestra
                <div className={`transition-all duration-200 ${isOpen ? 'ring-4 ring-blue-500/50 rounded-lg' : ''}`}>
                    <SchedulePreviewCard
                        details={displayDetails}
                        horario={displayHorario}
                        tipo={displayType}
                        isPending={isPendingRotativoAssignment}
                    />
                </div>
            )}
        </button>
    );

    return (
        <td
            ref={wrapperRef}
            className={`p-1 relative align-middle group ${cellWidthClass} ${isToday ? 'bg-sky-50/50' : ''} ${className || ''}`}
        >
            <Tooltip 
                text={<ScheduleTooltipContent 
                    details={displayDetails} 
                    horario={displayHorario} 
                    tipo={displayType} 
                    scheduleData={scheduleData}
                    isPending={isPendingRotativoAssignment}
                />} 
                placement={tooltipPlacement} 
                offset={32} 
                disabled={isOpen}
            >
                {wrapperContent}
            </Tooltip>

            <ScheduleSelectionPanel
                isOpen={isOpen}
                panelStyle={panelStyle}
                allRotativoTurns={allRotativoTurns}
                onSelect={handleSelectInPanel}
                onClose={() => onToggleOpen(null)}
                currentSelection={currentSelection} 
            />
        </td>
    );
});