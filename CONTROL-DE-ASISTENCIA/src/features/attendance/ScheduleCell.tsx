import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
// ¡FIX IMPORTACIONES! Se eliminan extensiones .tsx/.ts OTRA VEZ
import { Tooltip } from '../../components/ui/Tooltip';
import { Sun, Moon, Sunset, Coffee, RotateCw, X, Check, AlertTriangle, XCircle } from 'lucide-react'; // Added XCircle
import { themes, statusColorPalette } from '../../config/theme';
import { getDay as getDayOfWeek } from 'date-fns'; // 0=Dom, 1=Lun, ...

// --- Helper: Icono de Turno ---
const getTurnoIcon = (turno: 'M' | 'V' | 'N' | string | null | undefined, size = 14) => {
    switch (turno) {
        case 'M': return <Sun size={size} className="text-amber-500 shrink-0" title="Matutino" />;
        case 'V': return <Sunset size={size} className="text-orange-500 shrink-0" title="Vespertino" />;
        case 'N': return <Moon size={size} className="text-indigo-500 shrink-0" title="Nocturno" />;
        default: return null;
    }
};

// --- Helper: Determinar Turno ---
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


// --- Helper: Ficha de Horario Visual ---
const SchedulePreviewCard = React.memo(({ details, horario, tipo }: { details: any, horario: any, tipo: 'fijo' | 'rotativo' | 'descanso' | 'default' }) => {

    const colorKey = horario?.ColorUI || 'slate';
    const theme = statusColorPalette[colorKey as keyof typeof statusColorPalette] || statusColorPalette.slate;
    const { bgText, border } = theme;
    const esRotativo = horario?.EsRotativo || tipo === 'rotativo';
    let content;
    let tooltipText = horario?.Nombre || 'Horario';

    if (tipo === 'descanso') {
        content = <span className="text-sm font-semibold text-slate-600 leading-tight">Descanso</span>;
        tooltipText = "Descanso Asignado";
    } else if (tipo === 'default' || tipo === 'fijo' || tipo === 'rotativo') {
         // Lógica unificada para mostrar detalles
         tooltipText = tipo === 'default' ? `Predeterminado: ${horario?.Nombre || 'Horario'}` : tooltipText;

        if (!details || !details.EsDiaLaboral) {
            content = <span className="text-sm font-semibold text-slate-600 leading-tight">Descanso</span>;
            tooltipText += ` (Descanso)`;
        } else {
            // ¡FIX! Asegurarse que HoraEntrada/Salida existen antes de substring
            const entrada = details.HoraEntrada ? details.HoraEntrada.substring(0, 5) : '??:??';
            const salida = details.HoraSalida ? details.HoraSalida.substring(0, 5) : '??:??';
            tooltipText += ` (${entrada} - ${salida})`;
            content = (
                <div className="flex items-center justify-center gap-2 h-full px-2 py-1 w-full">
                    <div className="flex flex-col items-center justify-center text-center">
                        <span className="text-[16px] font-semibold leading-tight block w-full text-center">{entrada}</span>
                        <span className="text-[10px] leading-tight text-slate-500 block w-full text-center">-</span>
                        <span className="text-[16px] font-semibold leading-tight block w-full text-center">{salida}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1.5 pl-2">
                        {getTurnoIcon(determineTurnoFromTime(details.HoraEntrada))}
                        {/* ¡FIX! Acceso seguro a TieneComida */}
                        {details?.TieneComida && <Coffee size={14} className="text-amber-700 shrink-0" title="Incluye comida" />}
                    </div>
                </div>
            );
        }
    } else {
         // Fallback por si acaso
         content = <span className="text-sm font-semibold text-slate-500">N/A</span>;
         tooltipText = "No asignado";
    }

    return (
        <Tooltip text={tooltipText}>
            <div className={`relative w-24 h-16 mx-auto rounded-md font-bold flex items-center justify-center transition-all duration-200 border-b-4 ${border}`}>
                {esRotativo && tipo !== 'rotativo' && (
                    <div className="absolute top-1 right-1 text-slate-500 opacity-70">
                        <RotateCw size={10} title="Horario Rotativo"/>
                    </div>
                )}
                <div className={`w-full h-full rounded-md ${bgText} bg-opacity-90 flex items-center justify-center shadow-inner-sm overflow-hidden`}>
                    {content}
                </div>
            </div>
        </Tooltip>
    );
});


// --- COMPONENTE: Panel de Selección de Turno (Zona 1 - Pop-up de Celda) ---
const ScheduleSelectionPanel = React.memo(({
    isOpen,
    panelStyle,
    allRotativoTurns, // Array de { horario, turno }
    onSelect, // Recibe { tipoAsignacion, horarioId, detalleId }
    onClose
}: {
    isOpen: boolean,
    panelStyle: React.CSSProperties,
    allRotativoTurns: any[],
    onSelect: (payload: any) => void,
    onClose: () => void
}) => {

    const panelRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer clic fuera
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

    return ReactDOM.createPortal(
        <div
            ref={panelRef}
            className="fixed bg-white rounded-lg shadow-xl border p-4 w-96 animate-scale-in z-[100]"
            style={panelStyle}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <button onClick={onClose} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
            </button>

            {/* --- Opciones de Excepción --- */}
            <div className="mb-3">
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Asignaciones Rápidas (Este día)</h4>
                <div className="flex gap-2">
                    {/* Botón: Usar Predeterminado */}
                    <button
                        onClick={() => onSelect({ tipoAsignacion: null })} // Enviar null borra la excepción
                        className="flex-1 p-2 rounded-md text-center group transition-all hover:bg-slate-200 bg-slate-100 text-slate-600"
                    >
                        <span className="font-bold block text-sm">Usar Predeterminado</span>
                        <span className="text-xs block">Quitar excepción</span>
                    </button>
                    {/* Botón: Marcar Descanso */}
                    <button
                        onClick={() => onSelect({ tipoAsignacion: 'D' })} // Enviar 'D' marca descanso
                        className="flex-1 p-2 rounded-md text-center group transition-all hover:bg-rose-200 bg-rose-100 text-rose-700"
                    >
                        <span className="font-bold block text-sm">Marcar Descanso</span>
                        <span className="text-xs block">Asignar descanso</span>
                    </button>
                </div>
            </div>

            {/* --- Lista de Turnos Rotativos (Simplificada) --- */}
            <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Turnos Rotativos (Este día)</h4>
                {allRotativoTurns.length > 0 ? (
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-2">
                        {allRotativoTurns.map(({ horario, turno }) => {
                             // Estilo simple: Icono, Nombre Horario (Turno X), E/S
                             const entrada = turno.HoraEntrada ? turno.HoraEntrada.substring(0, 5) : '??:??';
                             const salida = turno.HoraSalida ? turno.HoraSalida.substring(0, 5) : '??:??';
                             const turnoLabel = `Turno ${turno.DiaSemana}`; // Asumiendo que DiaSemana es el identificador
                             const colorKey = horario?.ColorUI || 'slate';
                             const theme = statusColorPalette[colorKey as keyof typeof statusColorPalette] || statusColorPalette.slate;

                            return (
                                <button
                                    key={turno.HorarioDetalleId}
                                    onClick={() => onSelect({
                                        tipoAsignacion: 'T',
                                        detalleId: turno.HorarioDetalleId // Solo necesitamos el ID del detalle
                                    })}
                                    className="w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 ring-offset-1 ring-[--theme-500]"
                                    title={`${horario.Nombre} - ${turnoLabel} (${entrada} - ${salida})`}
                                >
                                    <span
                                        className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: theme.bgLight }}
                                    >
                                         {getTurnoIcon(determineTurnoFromTime(turno.HoraEntrada), 14)}
                                    </span>
                                    <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                                        {horario.Nombre} ({turnoLabel})
                                    </span>
                                    <span className="text-xs font-mono text-slate-500">{entrada} - {salida}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 text-center p-4 bg-slate-50 rounded-md">No hay turnos rotativos definidos.</p>
                )}
            </div>
        </div>,
        document.body
    );
});


// --- COMPONENTE PRINCIPAL: ScheduleCell ---

export const ScheduleCell = ({
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
}: any) => {

    const wrapperRef = useRef<HTMLTableCellElement>(null);
    const [panelStyle, setPanelStyle] = useState({});

    // --- 1. Lógica de Datos: Determinar qué mostrar ---
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

        // Fallback robusto si 'details' no se encuentra o el horario no tiene turnos definidos
        if (!details) {
            details = { EsDiaLaboral: false }; // Asumir descanso si no hay info
            // Si no era un descanso explícito ('D'), pero no hay detalles, se trata como descanso
            if (tipo !== 'descanso') tipo = 'descanso';
        }

        return { displayDetails: details, displayHorario: horario, displayType: tipo };

    }, [scheduleData, horarioDefaultId, scheduleCatalog, day]);

    // --- 2. Lógica de UI: Extraer turnos rotativos para el panel ---
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


    // --- 3. Manejadores de Eventos ---
    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const cellRect = wrapperRef.current.getBoundingClientRect();
            const panelHeight = 400; // Aprox
            const panelWidth = 384; // w-96
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

    // Clic en la celda
    const handleToggle = () => {
        // DEBUG: Confirmar que handleToggle se llama
        console.log('handleToggle called for cell:', cellId);
        if (scheduleData?.EstatusConflictivo || !canAssign) return;
        onToggleOpen(cellId);
    };

    // Selección en el panel (Acción 1)
    const handleSelectInPanel = (payload: any) => {
        onScheduleChange(payload); // { tipoAsignacion, horarioId, detalleId }
        onToggleOpen(null); // Cerrar panel
    };

    // --- 4. Renderizado ---
    const isConflict = !!scheduleData?.EstatusConflictivo;
    const cellWidthClass = viewMode === 'week' ? 'min-w-[7rem]' : 'min-w-[5rem]';

    return (
        <td
            ref={wrapperRef}
            className={`p-1 relative align-middle group ${cellWidthClass} ${isToday ? 'bg-sky-50/50' : ''}`}
            // onDragEnter={() => {}} // Eliminado, no usamos drag en celda
            // ¡FIX CLICK! Eliminado stopPropagation de aquí
        >
            <button
                onClick={handleToggle} // Este es el clic principal
                className={`w-full h-full rounded-lg transition-all duration-200 focus:outline-none focus:visible:ring-0
                    ${isConflict ? 'cursor-not-allowed opacity-70' : ''}
                    ${canAssign && !isConflict ? 'hover:scale-105' : 'cursor-default'}
                `}
                disabled={!canAssign && !isConflict} // Solo deshabilita si no puede asignar Y no hay conflicto
            >
                {isConflict ? (
                    <Tooltip text={`Conflicto: ${scheduleData.EstatusConflictivo}`}>
                        <div className="relative w-24 h-16 mx-auto rounded-md font-bold flex items-center justify-center transition-all duration-200 border-b-4 border-orange-400">
                             <div className="w-full h-full rounded-md bg-orange-100 bg-opacity-90 flex flex-col items-center justify-center shadow-inner-sm overflow-hidden p-1 text-center">
                                <AlertTriangle size={24} className="text-orange-600" />
                                <span className="text-xs font-semibold text-orange-700 mt-1 leading-tight">{scheduleData.EstatusConflictivo}</span>
                             </div>
                         </div>
                    </Tooltip>
                ) : (
                    <SchedulePreviewCard
                        details={displayDetails}
                        horario={displayHorario}
                        tipo={displayType}
                    />
                )}
            </button>

            <ScheduleSelectionPanel
                isOpen={isOpen}
                panelStyle={panelStyle}
                allRotativoTurns={allRotativoTurns}
                onSelect={handleSelectInPanel}
                onClose={() => onToggleOpen(null)}
            />
        </td>
    );
};

