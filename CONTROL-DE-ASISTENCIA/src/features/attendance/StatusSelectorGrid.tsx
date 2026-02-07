//src/features/attendance/StatusSelectorGrid.tsx
// src/features/attendance/StatusSelectorGrid.tsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Check, CheckCheck, Save, X } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';
import { statusColorPalette } from '../../config/theme';
import { canAssignStatusToDate, getRestrictionMessage } from '../../utils/attendanceValidation';
import { AttendanceStatus, AttendanceStatusCode } from '../../types';

const getColorClasses = (colorName: string = 'slate') => {
    const palette = statusColorPalette[colorName] || statusColorPalette.slate;
    return {
        bgText: palette.bgText,
        border: palette.border,
        lightBorder: palette.lightBorder,
        pastel: (palette as any).pastel || `bg-${colorName}-50 text-${colorName}-700` 
    };
};

interface StatusSelectorGridProps {
    isOpen?: boolean;
    anchorEl?: HTMLElement | null;
    statusCatalog: AttendanceStatus[];
    ficha: any;
    fecha: Date;
    isRestDay: boolean;
    onStatusChange: (status: AttendanceStatusCode | null, comment?: string | null) => void;
    onClose?: () => void;
    inline?: boolean;
    hideCommentBox?: boolean;
}

export const StatusSelectorGrid = ({
    isOpen = true,
    anchorEl,
    statusCatalog,
    ficha,
    fecha,
    isRestDay,
    onStatusChange,
    inline = false,
    hideCommentBox = false
}: StatusSelectorGridProps) => {
    const [panelStyle, setPanelStyle] = useState({});
    const [comment, setComment] = useState('');
    const [justSaved, setJustSaved] = useState(false);

    // Lógica para determinar el estado actual y configuración (para mostrar/ocultar comentarios)
    const isCleanBorrador = ficha?.Estado === 'BORRADOR' && !ficha.EstatusManualAbrev && !ficha.EstatusChecadorAbrev;
    let finalStatus = 'F'; 
    if (isRestDay) finalStatus = 'D';
    else if (ficha?.EstatusManualAbrev) finalStatus = ficha.EstatusManualAbrev;
    else if (ficha?.EstatusChecadorAbrev) finalStatus = ficha.EstatusChecadorAbrev;
    else if (!ficha || isCleanBorrador) finalStatus = '-';

    const currentStatusConfig = statusCatalog.find((s: any) => s.Abreviatura === finalStatus) || (finalStatus === '-' ? { ColorUI: 'slate', Descripcion: 'No generado', PermiteComentario: false } : { ColorUI: 'blue', Descripcion: 'Desconocido', PermiteComentario: true });

    useEffect(() => {
        if (!inline && isOpen && anchorEl) {
            const cellRect = anchorEl.getBoundingClientRect();
            const panelHeight = currentStatusConfig?.PermiteComentario ? 420 : 320;
            let top = cellRect.bottom + 8;
            
            if (cellRect.bottom + panelHeight > window.innerHeight && cellRect.top > panelHeight + 8) {
                top = cellRect.top - panelHeight - 8;
            }
            
            // Centrado horizontal
            let left = cellRect.left + (cellRect.width / 2) - 192; // 192 es la mitad de w-96 (384px)
            if (left < 10) left = 10;
            if (left + 384 > window.innerWidth) left = window.innerWidth - 394;

            setPanelStyle({ top, left });
            setComment(ficha?.Comentarios || '');
        }
        // Sincronizar comentario inicial si cambia la ficha
        if (ficha?.Comentarios !== comment && !justSaved) {
             setComment(ficha?.Comentarios || '');
        }
    }, [isOpen, anchorEl, ficha, currentStatusConfig, inline]);

    const handleToggleInteraction = (clickedStatus: AttendanceStatusCode) => {
        const currentManual = ficha?.EstatusManualAbrev;
        if (currentManual === clickedStatus) {
            onStatusChange(null, null); 
        } else {
            const selectedStatusConfig = statusCatalog.find((s: AttendanceStatus) => s.Abreviatura === clickedStatus);
            onStatusChange(clickedStatus, selectedStatusConfig?.PermiteComentario ? comment : undefined);
        }
    };

    const handleSaveComment = () => { 
        onStatusChange(finalStatus as AttendanceStatusCode, comment); 
        setJustSaved(true); 
        setTimeout(() => setJustSaved(false), 1500); 
    };

    if (!isOpen) return null;

    const content = (
        <div 
            className={inline ? "w-full" : "fixed bg-white rounded-lg shadow-xl border z-50 p-2 w-64 animate-scale-in"} 
            style={inline ? {} : panelStyle} 
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className={`grid ${inline ? 'grid-cols-3 gap-2' : 'grid-cols-3 gap-1'}`}>
                {statusCatalog.filter((status: AttendanceStatus) => inline || status.VisibleSupervisor || status.Abreviatura === ficha?.EstatusChecadorAbrev).map((status: AttendanceStatus) => {
                        const themeBtn = getColorClasses(status.ColorUI);
                        
                        // FIX: Asegurar que DiasRegistroFuturo tenga valor (0 por defecto) para evitar "undefined" en validaciones
                        const safeStatus = { ...status, DiasRegistroFuturo: status.DiasRegistroFuturo ?? 0 };
                        
                        const isStatusAllowed = fecha ? canAssignStatusToDate(safeStatus, fecha) : true;
                        const isSelected = ficha?.EstatusManualAbrev === status.Abreviatura;
                        const isSuggested = status.Abreviatura === ficha?.EstatusChecadorAbrev;
                        return (
                            <Tooltip key={status.EstatusId} text={isSelected ? "Click para DESHACER (Volver a Borrador)" : (fecha ? getRestrictionMessage(safeStatus, fecha) || status.Descripcion : status.Descripcion)} placement="top" offset={8} zIndex={100}>
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
            {currentStatusConfig?.PermiteComentario && !hideCommentBox && (
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
        </div>
    );

    if (inline) return content;
    return ReactDOM.createPortal(content, document.body);
};
