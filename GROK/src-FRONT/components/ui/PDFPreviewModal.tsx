// src/components/ui/PDFPreviewModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button } from './Modal';
import { Download, ChevronDown, Save, Palette, Leaf, LayoutTemplate, LayoutList, Layout, Feather, ExternalLink,Printer } from 'lucide-react';
import { REPORT_THEMES, REPORT_LAYOUTS, ReportThemeKey, ReportLayoutKey } from '../../utils/report-engine/CoreReportGenerator';
import { Tooltip } from './Tooltip';

interface PDFPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pdfUrl: string | null;
    title: string;
    onSettingsChange: (settings: { theme: ReportThemeKey, layout: ReportLayoutKey }) => void;
    onSave: (saveAs: boolean) => void; 
    allowedLayouts?: ReportLayoutKey[];
}

export const PDFPreviewModal = ({ 
    isOpen, onClose, pdfUrl, title, onSettingsChange, onSave,
    allowedLayouts = ['standard', 'compact', 'executive', 'signature'] 
}: PDFPreviewModalProps) => {
    const [currentTheme, setCurrentTheme] = useState<ReportThemeKey>('corporate');
    const [currentLayout, setCurrentLayout] = useState<ReportLayoutKey>(allowedLayouts[0]);
    const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
    const saveMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (saveMenuRef.current && !saveMenuRef.current.contains(event.target as Node)) {
                setIsSaveMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && !allowedLayouts.includes(currentLayout)) {
            setCurrentLayout(allowedLayouts[0]);
        }
    }, [isOpen, allowedLayouts]);

    const updateSettings = (newTheme: ReportThemeKey, newLayout: ReportLayoutKey) => {
        setCurrentTheme(newTheme);
        setCurrentLayout(newLayout);
        onSettingsChange({ theme: newTheme, layout: newLayout });
    };

    if (!pdfUrl) return null;

    const layoutIcons = {
        standard: <Layout size={16} />,
        compact: <LayoutList size={16} />,
        executive: <LayoutTemplate size={16} />,
        signature: <Feather size={16} />
    };

    const footer = (
        <div className="flex flex-col xl:flex-row justify-between w-full items-center gap-4">
            
            {/* IZQUIERDA: Personalización */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1 bg-white rounded-md border border-slate-200 p-0.5 shadow-sm">
                    {(Object.keys(REPORT_LAYOUTS) as ReportLayoutKey[])
                        .filter(key => allowedLayouts.includes(key))
                        .map((key) => (
                        <Tooltip key={key} text={REPORT_LAYOUTS[key].desc}>
                            <button
                                onClick={() => updateSettings(currentTheme, key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                    currentLayout === key 
                                        ? 'bg-slate-800 text-white shadow-sm' 
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {layoutIcons[key]}
                                {REPORT_LAYOUTS[key].label}
                            </button>
                        </Tooltip>
                    ))}
                </div>
                <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>
                <div className="flex items-center gap-2 px-1">
                    <Palette size={16} className="text-slate-400" />
                    {Object.entries(REPORT_THEMES).filter(([key]) => !REPORT_THEMES[key as ReportThemeKey].isEco).map(([key, theme]) => (
                        <Tooltip key={key} text={theme.name}>
                            <button onClick={() => updateSettings(key as ReportThemeKey, currentLayout)} className={`w-5 h-5 rounded-full transition-all duration-200 ring-offset-1 ${currentTheme === key ? 'ring-2 ring-slate-400 scale-110' : 'hover:scale-110 ring-0'}`} style={{ backgroundColor: theme.primary }} />
                        </Tooltip>
                    ))}
                </div>
                <Tooltip text={currentTheme === 'eco' ? "Restaurar Color" : "Ahorro de Tinta (B/N)"}>
                    <button onClick={() => updateSettings(currentTheme === 'eco' ? 'corporate' : 'eco', currentLayout)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${currentTheme === 'eco' ? 'bg-green-50 border-green-200 text-green-700 shadow-inner' : 'bg-white border-slate-200 text-slate-500 hover:text-green-600'}`}>
                        <Leaf size={14} />
                        <span className="text-xs font-semibold hidden sm:inline">Eco</span>
                    </button>
                </Tooltip>
            </div>

            {/* DERECHA: Acciones */}
            <div className="flex gap-3">
                
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                
                {/* Split Button: Descargar */}
                <div className="relative inline-flex shadow-sm rounded-md" ref={saveMenuRef}>
                    <button onClick={() => onSave(false)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold text-sm rounded-l-lg hover:bg-indigo-700 focus:outline-none border-r border-indigo-700 transition-colors">
                        <Download size={16} /> Descargar
                    </button>
                    <button onClick={() => setIsSaveMenuOpen(!isSaveMenuOpen)} className="px-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 focus:outline-none transition-colors">
                        <ChevronDown size={16} />
                    </button>
                    {isSaveMenuOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-scale-in z-50">
                            <button onClick={() => { onSave(true); setIsSaveMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors">
                                <Save size={16} /> Guardar como...                            
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
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                <iframe src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} className="w-full h-full shadow-lg" title="Vista Previa PDF" />
            </div>
        </Modal>
    );
};