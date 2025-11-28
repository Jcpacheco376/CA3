// src/components/ui/PDFPreviewModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button } from './Modal';
import { Download, Printer, ExternalLink, Leaf, Palette, ChevronDown, Save } from 'lucide-react';
import { REPORT_THEMES, ReportThemeKey } from '../../utils/reportExporter';
import { Tooltip } from './Tooltip';

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string | null;
    title: string;
    fileName?: string;
    // Callback para cuando el usuario cambia opciones visuales
    onSettingsChange: (theme: ReportThemeKey) => void;
    // Callback para accionar el guardado real (desde el padre que tiene el builder)
    onSave: (saveAs: boolean) => void; 
}

export const PDFPreviewModal = ({ isOpen, onClose, pdfUrl, title, onSettingsChange, onSave }: PDFPreviewModalProps) => {
    const [currentTheme, setCurrentTheme] = useState<ReportThemeKey>('corporate');
    const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
    const saveMenuRef = useRef<HTMLDivElement>(null);

    // Cerrar menú de guardar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (saveMenuRef.current && !saveMenuRef.current.contains(event.target as Node)) {
                setIsSaveMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!pdfUrl) return null;

    const handleThemeChange = (theme: ReportThemeKey) => {
        setCurrentTheme(theme);
        onSettingsChange(theme); // Notificar al padre para regenerar
    };

    const footer = (
        <div className="flex justify-between w-full items-center">
            {/* IZQUIERDA: Configuración Visual */}
            <div className="flex items-center gap-4">
                
                {/* Selector de Color (Paleta) */}
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                    <Palette size={16} className="text-slate-400 ml-1" />
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    {Object.entries(REPORT_THEMES).filter(([key]) => key !== 'eco').map(([key, theme]) => (
                        <Tooltip key={key} text={theme.name}>
                            <button
                                onClick={() => handleThemeChange(key as ReportThemeKey)}
                                className={`w-5 h-5 rounded-full transition-all duration-200 ${currentTheme === key ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                                style={{ backgroundColor: theme.primary }}
                            />
                        </Tooltip>
                    ))}
                </div>

                {/* Botón Eco (Hoja) */}
                <Tooltip text={currentTheme === 'eco' ? "Desactivar Ahorro de Tinta" : "Modo Ahorro de Tinta (Eco)"}>
                    <button
                        onClick={() => handleThemeChange(currentTheme === 'eco' ? 'corporate' : 'eco')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                            currentTheme === 'eco' 
                                ? 'bg-green-50 border-green-200 text-green-700 shadow-inner' 
                                : 'bg-white border-slate-200 text-slate-500 hover:text-green-600 hover:border-green-200'
                        }`}
                    >
                        <Leaf size={16} />
                        <span className="text-xs font-semibold hidden sm:inline">Eco</span>
                    </button>
                </Tooltip>
            </div>

            {/* DERECHA: Acciones */}
            <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                
                {/* SPLIT BUTTON: GUARDAR */}
                <div className="relative inline-flex shadow-sm rounded-md group" ref={saveMenuRef}>
                    {/* Parte Principal: Guardar Directo */}
                    <button
                        onClick={() => onSave(false)} // false = descarga directa
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-l-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        <Download size={16} />
                        Descargar
                    </button>
                    
                    {/* Separador visual */}
                    <div className="w-px bg-indigo-700"></div>

                    {/* Parte Secundaria: Menú */}
                    <button
                        onClick={() => setIsSaveMenuOpen(!isSaveMenuOpen)}
                        className="px-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        <ChevronDown size={16} />
                    </button>

                    {/* Menú Desplegable */}
                    {isSaveMenuOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-scale-in origin-bottom-right z-50">
                            <button
                                onClick={() => { onSave(true); setIsSaveMenuOpen(false); }} // true = guardar como
                                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                            >
                                <Save size={16} />
                                Guardar como...
                            </button>
                            <div className="border-t border-slate-100"></div>
                            <button
                                onClick={() => window.open(pdfUrl, '_blank')}
                                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                            >
                                <Printer size={16} />
                                Imprimir / Pestaña
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Vista Previa: ${title}`} size="5xl" footer={footer}>
            <div className="bg-slate-200/50 rounded-lg border border-slate-200 overflow-hidden h-[70vh] flex items-center justify-center relative">
                {/* Fondo sutil para que resalte la hoja del PDF */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" 
                     style={{backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                </div>
                
                <iframe 
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
                    className="w-full h-full shadow-lg"
                    title="Vista Previa PDF"
                    style={{ backgroundColor: 'transparent' }} 
                />
            </div>
        </Modal>
    );
};