// src/features/admin/CatalogosPage.tsx
import React from 'react';
import { useAuth } from '../auth/AuthContext.tsx';
//import { Building, UsersIcon, Clock, CalendarIcon } from '../../components/ui/Icons.tsx';
import { Building, Users, Clock, CalendarCheck } from 'lucide-react';

const CatalogCard = ({ title, description, icon, onClick, canAccess }: any) => {
    if (!canAccess) return null;
    return (
        <button onClick={onClick} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-[--theme-500] transition-all text-left w-full disabled:opacity-50 disabled:cursor-not-allowed">
            <div className="flex items-start space-x-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">{icon}</div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
            </div>
        </button>
    );
};

export const CatalogosPage = ({ setActiveView }: any) => {
    const { can } = useAuth();

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Gestión de Catálogos</h1>
                <p className="mt-2 text-slate-500">Administra los datos maestros que alimentan el sistema de asistencia.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CatalogCard
                    title="Departamentos"
                    description="Ver y gestionar los departamentos de la empresa."
                    icon={<Building />}
                    onClick={() => setActiveView('admin_departamentos')}
                    canAccess={can('catalogo.departamentos.manage')}
                />
                <CatalogCard
                    title="Grupos de Nómina"
                    description="Ver y gestionar los grupos para el cálculo de nómina."
                    icon={<Users />}
                    onClick={() => setActiveView('admin_grupos_nomina')}
                    canAccess={can('catalogo.gruposNomina.manage')}
                />
                <CatalogCard
                    title="Estatus de Asistencia"
                    description="Configura los tipos de incidencia, colores y valores para la nómina."
                    icon={<CalendarCheck />}
                    onClick={() => setActiveView('admin_estatus_asistencia')}
                    canAccess={can('catalogo.estatusAsistencia.read')}
                />
                <CatalogCard
                    title="Horarios"
                    description="Define y administra los horarios de trabajo."
                    icon={<Clock />}
                    onClick={() => setActiveView('admin_horarios')}
                    canAccess={can('catalogo.horarios.read')}
                />
            </div>
        </div>
    );
};

