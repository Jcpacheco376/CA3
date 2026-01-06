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
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-colors ${isActive ? 'border-[--theme-500] text-[--theme-600]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
        {icon} {label}
    </button>
);

export const ReportsLayout = ({ activeView, setActiveView }: { activeView: View, setActiveView: (view: View) => void }) => {
    const { can } = useAuth();

    const reportTabs = [
        can('reportes.kardex.read') && { id: 'report_kardex', label: 'Kardex Asistencia', icon: <ClipboardList size={18} />, component: <KardexReportPage /> },
        can('reportes.lista_asistencia.read') && { id: 'report_attendance_list', label: 'Lista de Asistencia', icon: <FileText size={18} />, component: <AttendanceListReportPage /> },
    can('reportes.prenomina.read') && { 
            id: 'report_prenomina', 
            label: 'Prenómina', 
            icon: <Banknote size={18} />, 
            component: <PrenominaReportPage /> 
        },
    ].filter(Boolean);

    const activeTab = reportTabs.find((tab: any) => tab.id === activeView);
    const pageTitle = activeTab?.label || 'Reportes';

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Tooltip text="Volver al menú de reportes">
                        <button onClick={() => setActiveView('attendance_reports')} className="p-2 rounded-full text-slate-500 hover:bg-slate-100"><ArrowLeft size={20} /></button>
                    </Tooltip>
                    <h1 className="text-3xl font-bold text-slate-900">{pageTitle}</h1>
                </div>
            </header>
            <nav className="flex items-center border-b border-slate-200 -mt-2 overflow-x-auto">
                {reportTabs.map((tab: any) => (
                    <TabButton key={tab.id} label={tab.label} icon={tab.icon} isActive={activeView === tab.id} onClick={() => setActiveView(tab.id)} />
                ))}
            </nav>
            <div className="mt-6">{activeTab?.component || <div className="p-8 text-center text-slate-500">Seleccione un reporte.</div>}</div>
        </div>
    );
};