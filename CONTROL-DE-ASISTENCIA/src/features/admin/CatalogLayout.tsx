// src/features/admin/CatalogLayout.tsx
import React from 'react';
import { useAuth } from '../auth/AuthContext.tsx';
import { View } from '../../types/index.ts';
import { ArrowLeft, Building, Users, CalendarCheck, Clock } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
import { DepartamentosPage } from './DepartamentosPage.tsx';
import { GruposNominaPage } from './GruposNominaPage.tsx';
import { EstatusAsistenciaPage } from './EstatusAsistenciaPage.tsx';
import { HorariosPage } from './HorariosPage.tsx';

// --- Componente Interno de Pestaña ---
const TabButton = ({ 
    icon, label, isActive, onClick, canAccess 
}: { 
    icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, canAccess: boolean 
}) => {
    if (!canAccess) return null;
    
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-4 py-3 border-b-2 font-semibold
                ${isActive
                    ? 'border-[--theme-500] text-[--theme-600]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }
            `}
        >
            {icon}
            {label}
        </button>
    );
};

// --- Componente Principal del Layout ---
export const CatalogLayout = ({ activeView, setActiveView }: { activeView: View, setActiveView: (view: View) => void }) => {
    const { can } = useAuth();

    // Definimos las pestañas de navegación
    const catalogTabs = [
        { 
            id: 'admin_departamentos', 
            label: 'Departamentos', 
            icon: <Building size={18} />, 
            canAccess: can('catalogo.departamentos.read'),
            component: <DepartamentosPage />
        },
        { 
            id: 'admin_grupos_nomina', 
            label: 'Grupos Nómina', 
            icon: <Users size={18} />, 
            canAccess: can('catalogo.gruposNomina.read'),
            component: <GruposNominaPage />
        },
        { 
            id: 'admin_estatus_asistencia', 
            label: 'Estatus Asistencia', 
            icon: <CalendarCheck size={18} />, 
            canAccess: can('catalogo.estatusAsistencia.read'),
            component: <EstatusAsistenciaPage />
        },
        { 
            id: 'admin_horarios', 
            label: 'Horarios', 
            icon: <Clock size={18} />, 
            canAccess: can('catalogo.horarios.read'),
            component: <HorariosPage />
        },
        // (Aquí se podrían añadir Puestos y Establecimientos cuando tengan sus páginas)
    ];

    const activeTab = catalogTabs.find(tab => tab.id === activeView);
    const pageTitle = activeTab?.label || 'Catálogos';

    // Función para renderizar el contenido de la pestaña activa
    const renderPageContent = () => {
        return activeTab?.component || <div className="p-4">Seleccione un catálogo.</div>;
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                {/* Título y Botón de Volver */}
                <div className="flex items-center gap-3">
                    <Tooltip text="Volver al menú de catálogos">
                        <button 
                            onClick={() => setActiveView('admin_catalogs')} 
                            className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </Tooltip>
                    <h1 className="text-3xl font-bold text-slate-900">{pageTitle}</h1>
                </div>
            </header>

            {/* Navegación de Pestañas */}
            <nav className="flex items-center border-b border-slate-200 -mt-2">
                {catalogTabs.map(tab => (
                    <TabButton
                        key={tab.id}
                        label={tab.label}
                        icon={tab.icon}
                        isActive={activeView === tab.id}
                        onClick={() => setActiveView(tab.id as View)}
                        canAccess={tab.canAccess}
                    />
                ))}
            </nav>

            {/* Contenido de la Página */}
            <div className="mt-6">
                {renderPageContent()}
            </div>
        </div>
    );
};