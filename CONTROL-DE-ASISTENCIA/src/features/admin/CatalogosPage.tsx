// src/features/admin/CatalogosPage.tsx
import React from 'react';
import { useAuth } from '../auth/AuthContext.tsx';
import { Building, Users, Clock, CalendarCheck, MapPin, Tag, Server } from 'lucide-react';

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
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-800">Gestión de Catálogos</h1>
                <p className="text-sm text-slate-500">Administra los datos maestros que alimentan el sistema de asistencia.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CatalogCard
                    title="Departamentos"
                    description="Ver y gestionar los departamentos de la empresa."
                    icon={<Building />}
                    onClick={() => setActiveView('admin_departamentos')}
                    canAccess={can('catalogo.departamentos.read')}
                />
                <CatalogCard
                    title="Grupos de Nómina"
                    description="Ver y gestionar los grupos para el cálculo de nómina."
                    icon={<Users />}
                    onClick={() => setActiveView('admin_grupos_nomina')}
                    canAccess={can('catalogo.gruposNomina.read')}
                />
                <CatalogCard
                    title="Puestos"
                    description="Ver y gestionar los puestos de trabajo."
                    icon={<Tag />}
                    onClick={() => setActiveView('admin_puestos')}
                    canAccess={can('catalogo.puestos.read')}
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
                <CatalogCard
                    title="Establecimientos"
                    description="Define y administra los departamentos de trabajo."
                    icon={<MapPin />}
                    onClick={() => setActiveView('admin_establecimientos')}
                    canAccess={can('catalogo.establecimientos.read')}
                />
                <CatalogCard
                    title="Empleados"
                    description="Gestiona la información de los colaboradores."
                    icon={<Users />}
                    onClick={() => setActiveView('admin_empleados')}
                    canAccess={can('catalogo.empleados.read')}
                />

            </div>
        </div>
    );
};