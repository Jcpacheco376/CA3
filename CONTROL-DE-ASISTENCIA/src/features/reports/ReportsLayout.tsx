// src/features/reports/ReportsLayout.tsx
import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { View } from '../../types';
import { ArrowLeft, ClipboardList, FileText,Banknote  } from 'lucide-react'; // <-- Importar FileText
import { Tooltip } from '../../components/ui/Tooltip';
import { KardexReportPage } from './pages/KardexReportPage'; 
import { AttendanceListReportPage } from './pages/AttendanceListReportPage'; // <-- Importar Página
import { PrenominaReportPage } from './pages/PrenominaReportPage'; // <--- IMPORTAR NUEVA PÁGINA

const TabButton = ({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick} 
        className={`
            flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-all text-sm
            ${isActive 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }
        `}
    >
        {icon} {label}
    </button>
);

export const ReportsLayout = ({ activeView, setActiveView }: { activeView: View, setActiveView: (view: View) => void }) => {
    const { can } = useAuth();

    const reportTabs = [
        can('reportes.kardex.read') && { id: 'report_kardex', label: 'Kardex', icon: <ClipboardList size={18} />, component: <KardexReportPage /> },
        can('reportes.lista_asistencia.read') && { id: 'report_attendance_list', label: 'Lista Asistencia', icon: <FileText size={18} />, component: <AttendanceListReportPage /> },
    can('reportes.prenomina.read') && { 
            id: 'report_prenomina', 
            label: 'Prenómina', 
            icon: <Banknote size={18} />, 
            component: <PrenominaReportPage /> 
        },
    ].filter(Boolean);

    const activeTab = reportTabs.find((tab: any) => tab.id === activeView);

    return (
        <div className="h-full flex flex-col space-y-2">
            <div className="flex-none pt-1">
                <div className="flex items-center border-b border-slate-200 px-1">
                    <Tooltip text="Volver al Centro de Reportes">
                        <button 
                            onClick={() => setActiveView('attendance_reports')} 
                            className="p-2 mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </Tooltip>

                    <div className="h-5 w-px bg-slate-200 mx-2 hidden sm:block"></div>

                    <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {reportTabs.map((tab: any) => (
                        <TabButton 
                            key={tab.id} 
                            label={tab.label} 
                            icon={tab.icon} 
                            isActive={activeView === tab.id} 
                            onClick={() => setActiveView(tab.id)} 
                        />
                    ))}
                </nav>
            </div>
            </div>

            {/* Contenido del Reporte */}
            <div className="flex-1 overflow-hidden">
                {activeTab?.component || <div className="p-8 text-center text-slate-500">Seleccione un reporte.</div>}
            </div>
        </div>
    );
};