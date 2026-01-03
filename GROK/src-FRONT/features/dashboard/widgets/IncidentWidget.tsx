// c/src/features/dashboard/widgets/IncidentWidget.tsx
import React from 'react';
import { Banknote, ChevronRight, Lock } from 'lucide-react';

export const PayrollStatusWidget = () => {
    // Datos Mockeados
    const diasRestantes = 3;
    const progresoCierre = 65; // Porcentaje completado del periodo
    const periodoActual = "16 Nov - 30 Nov";
    
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col relative overflow-hidden">
            {/* Decoración de fondo */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full opacity-50 z-0"></div>

            <div className="flex items-center gap-3 mb-4 z-10">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Banknote size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">Cierre de Nómina</h3>
                    <p className="text-xs text-slate-500">{periodoActual}</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center z-10">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-3xl font-bold text-slate-800">{diasRestantes}</span>
                    <span className="text-xs font-medium text-slate-500 mb-1">días para cierre</span>
                </div>

                {/* Barra de Progreso */}
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full relative"
                        style={{ width: `${progresoCierre}%` }}
                    >
                         <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/30 animate-pulse"></div>
                    </div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-400 uppercase font-semibold">
                    <span>Inicio</span>
                    <span>Cierre</span>
                </div>
            </div>

            <button className="mt-4 w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 group z-10">
                <span>Ir al Cierre</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
};