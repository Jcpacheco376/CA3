// src/components/layout/MainLayout.tsx
import React, { useState } from 'react';
import { User, View } from '../../types';
import { useAuth } from '../../features/auth/AuthContext';
import { AttendancePage } from '../../features/attendance/AttendancePage';
import { UsersPage } from '../../features/admin/UsersPage';
import { RolesPage } from '../../features/admin/RolesPage';
import { CatalogLayout } from '../../features/admin/CatalogLayout';
import { CatalogosPage } from '../../features/admin/CatalogosPage';
import { UserProfileModal } from '../../features/auth/UserProfileModal';
import { ProfessionalSidebar } from './ProfessionalSidebar';
import { AppHeader } from './AppHeader';
import { BarChartBig, Users, Settings, Folder, FileText, CalendarClock, AlertTriangle, Lock } from 'lucide-react';
import { SchedulePage } from '../../features/attendance/SchedulePage';
import { ReportsHub } from '../../features/reports/ReportsHub';
import { ReportsLayout } from '../../features/reports/ReportsLayout';
import { IncidentsControlPage } from '../../features/reports/pages/IncidentsControlPage';
import PayrollClosingPage from '../../features/payroll/PayrollClosingPage';


interface MainLayoutProps {
    user: User;
    onLogout: () => void;
    activeView: View;
    setActiveView: (view: View) => void;
    setTheme: (theme: string) => void;
    themeColors: { [key: number]: string };
}

export const MainLayout = ({ user, onLogout, activeView, setActiveView, setTheme, themeColors }: MainLayoutProps) => {
    const { can } = useAuth();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const menuConfig = [
        {
            section: 'Principal',
            items: [
                { id: 'attendance_weekly', label: 'Registro de Asistencia', icon: <BarChartBig size={20} /> },

                can('reportesAsistencia.read') && {
                    id: 'report_incidencias',
                    label: 'Control de Incidencias',
                    icon: <AlertTriangle size={20} />
                },

                can('horarios.read') && { id: 'schedule_planner', label: 'Programador de Horarios', icon: <CalendarClock size={20} /> },
                { id: 'attendance_reports', label: 'Reportes', icon: <FileText size={20} /> },
            ].filter(Boolean)
        },
        (can('usuarios.read') || can('roles.manage') || can('catalogo.departamentos.read') || can('catalogo.gruposNomina.read') || can('catalogo.estatusAsistencia.read') || can('catalogo.horarios.read') || can('catalogo.establecimientos.read') || can('catalogo.puestos.read')) && {
            section: 'Administración',
            items: [
                can('usuarios.read') && { id: 'admin_users', label: 'Usuarios', icon: <Users size={20} /> },
                can('roles.manage') && { id: 'admin_roles', label: 'Roles', icon: <Settings size={20} /> },
                (can('catalogo.departamentos.read') || can('catalogo.gruposNomina.read') || can('catalogo.estatusAsistencia.read') || can('catalogo.horarios.read') || can('catalogo.establecimientos.read') || can('catalogo.puestos.read')) && { id: 'admin_catalogs', label: 'Catálogos', icon: <Folder size={20} /> }
            ].filter(Boolean)
        },
       can('nomina.read') && {
            section: 'Nómina',
            items: [
                {
                    id: 'payroll_closing',
                    label: 'Cierre de Periodo',
                    icon: <Lock size={20} />
                }
            ] // No necesitamos filter(Boolean) aquí porque es un array estático simple si entramos al if
        },
    ].filter(Boolean);
    const renderContent = () => {
        switch (activeView) {
            // Módulos Principales
            case 'attendance_weekly': return <AttendancePage />;
            case 'schedule_planner': return <SchedulePage />;
            case 'report_incidencias': return <IncidentsControlPage />;

            // Administración
            case 'admin_users': return <UsersPage />;
            case 'admin_roles': return <RolesPage />;
            case 'admin_catalogs': return <CatalogosPage setActiveView={setActiveView} />;

            // Catálogos
            case 'admin_departamentos':
            case 'admin_grupos_nomina':
            case 'admin_estatus_asistencia':
            case 'admin_horarios':
            case 'admin_establecimientos':
            case 'admin_puestos':
                return <CatalogLayout activeView={activeView} setActiveView={setActiveView} />;

            // Reportes (Hub)
            case 'attendance_reports':
                return <ReportsHub setActiveView={setActiveView} />;

            // Reportes (Layout Específico)
            case 'report_kardex':
            case 'report_attendance_list':
                return <ReportsLayout activeView={activeView} setActiveView={setActiveView} />;
            case 'payroll_closing':
                return <PayrollClosingPage />;

            default: return <AttendancePage />;
        }
    };

    return (
        <div className="flex bg-gray-50 h-screen overflow-hidden">
            <ProfessionalSidebar
                onLogout={onLogout}
                activeView={activeView}
                setActiveView={setActiveView}
                menuConfig={menuConfig}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <AppHeader user={user} onProfileClick={() => setIsProfileModalOpen(true)} themeColors={themeColors} />
                <main className="flex-1 p-8 text-slate-900 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
            <UserProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                user={user}
                setTheme={setTheme}
            />
        </div>
    );
};