// src/features/reports/ReportsHub.tsx
import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { FileText, ClipboardList, Banknote, History } from 'lucide-react'; // Eliminamos AlertTriangle

const ReportCard = ({ title, description, icon, onClick, disabled = false }: any) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`
            bg-white p-6 rounded-lg shadow-sm border border-slate-200 text-left w-full
            transition-all group
            ${disabled 
                ? 'opacity-60 cursor-not-allowed bg-slate-50' 
                : 'hover:shadow-md hover:border-[--theme-500]'
            }
        `}
    >
        <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-lg transition-colors ${disabled ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200'}`}>
                {icon}
            </div>
            <div>
                <h3 className={`text-lg font-bold ${disabled ? 'text-slate-500' : 'text-slate-900'}`}>{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
        </div>
    </button>
);

export const ReportsHub = ({ setActiveView }: { setActiveView: (view: any) => void }) => {
    // const { can } = useAuth(); // Ya no se usa si no hay lógica condicional aquí

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Centro de Reportes</h1>
                <p className="mt-2 text-slate-500">Genera, analiza y exporta la información de asistencia y nómina.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* GRUPO: OPERATIVOS */}
                <div className="col-span-full pb-2 border-b border-slate-200 mb-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operativos</h4>
                </div>

                <ReportCard
                    title="Kardex de Asistencia"
                    description="Historial detallado de asistencia por empleado en un periodo."
                    icon={<ClipboardList />}
                    onClick={() => setActiveView('report_kardex')}
                />
                
                <ReportCard
                    title="Lista de Asistencia"
                    description="Resumen diario de asistencia (quién vino y quién no)."
                    icon={<FileText />}
                    onClick={() => console.log("TODO")}
                    disabled={true}
                />

                {/* GRUPO: NÓMINA Y CONTROL */}
                <div className="col-span-full pb-2 border-b border-slate-200 mb-2 mt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nómina</h4>
                </div>

                {/* Se eliminó la tarjeta de Control de Incidencias de aquí */}

                <ReportCard
                    title="Prenómina"
                    description="Cálculo final de horas y conceptos para pago. Requiere validación de incidencias."
                    icon={<Banknote />}
                    onClick={() => console.log("TODO")}
                    disabled={true}
                />

                {/* GRUPO: AUDITORÍA */}
                <div className="col-span-full pb-2 border-b border-slate-200 mb-2 mt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auditoría</h4>
                </div>

                <ReportCard
                    title="Bitácora de Cambios"
                    description="Historial de modificaciones manuales realizadas en Registro de Asistencia."
                    icon={<History />}
                    onClick={() => console.log("TODO")}
                    disabled={true}
                />
            </div>
        </div>
    );
};