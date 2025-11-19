import React, { useState } from 'react';
import { Search, Download, FileSpreadsheet, Calendar } from 'lucide-react';
import { Button } from '../../../components/ui/Modal';
import { Tooltip } from '../../../components/ui/Tooltip';

export const KardexReportPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [hasData, setHasData] = useState(false); // Simulación

    const handleGenerate = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setHasData(true);
        }, 1500);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. Barra de Herramientas de Filtros */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                    {/* Selector de Fechas (Simulado por ahora) */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500">Periodo</label>
                        <button className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-100">
                            <Calendar size={16} />
                            <span>Esta Semana</span>
                        </button>
                    </div>

                    {/* Filtros de Empleado/Depto (Simulado - aquí irían tus FilterPopovers) */}
                    <div className="flex flex-col gap-1 flex-grow md:flex-grow-0">
                         <label className="text-xs font-semibold text-slate-500">Filtros</label>
                         <div className="flex gap-2">
                            <button className="px-3 py-2 border border-slate-300 border-dashed rounded-md text-sm text-slate-500 hover:text-slate-700 hover:border-slate-400">
                                + Agregar Filtro
                            </button>
                         </div>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <Button onClick={handleGenerate} disabled={isLoading}>
                        {isLoading ? 'Generando...' : 'Generar Reporte'}
                    </Button>
                </div>
            </div>

            {/* 2. Área de Resultados */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[400px] flex flex-col">
                
                {/* Header de Resultados (Acciones de Exportación) */}
                <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <h3 className="font-semibold text-slate-700">Resultados</h3>
                    <div className="flex gap-2">
                        <Tooltip text="Exportar a Excel">
                            <button disabled={!hasData} className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                                <FileSpreadsheet size={20} />
                            </button>
                        </Tooltip>
                        <Tooltip text="Exportar a PDF">
                            <button disabled={!hasData} className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                                <Download size={20} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Tabla o Estado Vacío */}
                <div className="flex-grow p-0 overflow-auto">
                    {!hasData ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p>Selecciona los filtros y haz clic en "Generar Reporte"</p>
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <p className="text-slate-600">Aquí irá la tabla detallada del Kardex (Simulación).</p>
                            {/* Aquí implementaremos la tabla real en el siguiente paso */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};