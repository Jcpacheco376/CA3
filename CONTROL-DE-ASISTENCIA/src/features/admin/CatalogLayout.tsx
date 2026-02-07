// src/features/admin/CatalogLayout.tsx
import React from 'react';
import { useAuth } from '../auth/AuthContext.tsx';
import { View } from '../../types/index.ts';
import { ArrowLeft, Building, Users, CalendarCheck, Clock, MapPin, Tag, Server } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
import { DepartamentosPage } from './DepartamentosPage.tsx';
import { GruposNominaPage } from './GruposNominaPage.tsx';
import { EstatusAsistenciaPage } from './EstatusAsistenciaPage.tsx';
import { HorariosPage } from './HorariosPage.tsx';
import { EstablecimientosPage } from './EstablecimientosPage.tsx';
import { PuestosPage } from './PuestosPage.tsx';
import { DevicesPage } from '../../features/devices/DevicesPage.tsx';

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
                flex items-center gap-2 px-4 py-2 border-b-2 font-medium transition-all text-sm
                ${isActive
                    ? 'border-indigo-600 text-indigo-600'
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
            id: 'admin_puestos', 
            label: 'Puestos', 
            icon: <Tag size={18} />, 
            canAccess: can('catalogo.puestos.read'),
            component: <PuestosPage />
        },
        { 
            id: 'admin_establecimientos', 
            label: 'Establecimientos', 
            icon: <MapPin size={18} />, 
            canAccess: can('catalogo.establecimientos.read'),
            component: <EstablecimientosPage />
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
        { 
            id: 'admin_devices', 
            label: 'Dispositivos', 
            icon: <Server size={18} />, 
            canAccess: can('dispositivos.read'),
            component: <DevicesPage />
        },
    ];

    const activeTab = catalogTabs.find(tab => tab.id === activeView);

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex-none pt-1">
                <div className="flex items-center border-b border-slate-200 px-1">
                    <Tooltip text="Volver al menú de catálogos">
                        <button 
                            onClick={() => setActiveView('admin_catalogs')} 
                            className="p-2 mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </Tooltip>
                    
                    <div className="h-5 w-px bg-slate-200 mx-2 hidden sm:block"></div>

                    <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
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
                </div>
            </div>

            {/* Contenido de la Página */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6">
                {activeTab?.component || <div className="p-8 text-center text-slate-500">Seleccione un catálogo.</div>}
            </div>
        </div>
    );
};