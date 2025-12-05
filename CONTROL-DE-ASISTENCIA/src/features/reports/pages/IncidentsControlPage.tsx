// src/features/reports/pages/IncidentsControlPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Play, RefreshCw, AlertTriangle, BadgeAlert, User, Shield, Hash, Info, 
    Building, Briefcase, Tag, MapPin 
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { useNotification } from '../../../context/NotificationContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { IncidentDetailModal } from '../components/IncidentDetailModal';
import { AttendanceToolbar, FilterConfig } from '../../attendance/AttendanceToolbar';
// IMPORTACIÓN DEL HOOK COMPARTIDO
import { useSharedAttendance } from '../../../hooks/useSharedAttendance';

// --- Componente interno para badges (sin cambios) ---
const SeverityBadge = ({ severity }: { severity: string }) => {
    const config = {
        'Critica': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', icon: <BadgeAlert size={12}/> },
        'Advertencia': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <AlertTriangle size={12}/> },
        'Info': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: <Info size={12}/> },
    };
    const style = config[severity as keyof typeof config] || config['Info'];
    
    return (
        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
            {style.icon} {severity}
        </span>
    );
};

export const IncidentsControlPage = () => {
    const { getToken, user } = useAuth(); // Necesitamos 'user' para los catálogos de filtros
    const { addNotification } = useNotification();
    
    // --- USO DEL HOOK COMPARTIDO ---
    // Reemplaza los estados locales de filtros, fechas y modo de vista
    const { 
        filters, setFilters, 
        viewMode, setViewMode, 
        currentDate, setCurrentDate, 
        dateRange, rangeLabel, 
        handleDatePrev, handleDateNext 
    } = useSharedAttendance(user);

    // Estados locales (específicos de esta página)
    const [searchTerm, setSearchTerm] = useState('');
    const [incidents, setIncidents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- CONFIGURACIÓN DE FILTROS DESPLEGABLES ---
    const filterConfigurations: FilterConfig[] = useMemo(() => {
        const configs: FilterConfig[] = [
            {
                id: 'departamentos',
                title: 'Departamentos',
                icon: <Building />,
                options: user?.Departamentos?.map(d => ({ value: d.DepartamentoId, label: d.Nombre })) || [],
                selectedValues: filters.depts,
                onChange: (vals) => setFilters(f => ({ ...f, depts: vals as number[] })),
                isActive: user?.activeFilters?.departamentos ?? false,
            },
            {
                id: 'gruposNomina',
                title: 'Grupos Nómina',
                icon: <Briefcase />,
                options: user?.GruposNomina?.map(g => ({ value: g.GrupoNominaId, label: g.Nombre })) || [],
                selectedValues: filters.groups,
                onChange: (vals) => setFilters(f => ({ ...f, groups: vals as number[] })),
                isActive: user?.activeFilters?.gruposNomina ?? false,
            },
            {
                id: 'puestos',
                title: 'Puestos',
                icon: <Tag />,
                options: user?.Puestos?.map(p => ({ value: p.PuestoId, label: p.Nombre })) || [],
                selectedValues: filters.puestos,
                onChange: (vals) => setFilters(f => ({ ...f, puestos: vals as number[] })),
                isActive: user?.activeFilters?.puestos ?? false,
            },
            {
                id: 'establecimientos',
                title: 'Establecimientos',
                icon: <MapPin />,
                options: user?.Establecimientos?.map(e => ({ value: e.EstablecimientoId, label: e.Nombre })) || [],
                selectedValues: filters.estabs,
                onChange: (vals) => setFilters(f => ({ ...f, estabs: vals as number[] })),
                isActive: user?.activeFilters?.establecimientos ?? false,
            }
        ];
        return configs.filter(c => c.isActive && c.options.length > 0);
    }, [user, filters, setFilters]);

    // --- CARGA DE DATOS ---
    const loadIncidents = useCallback(async () => {
        if (!dateRange || dateRange.length === 0) return; // Protección

        setIsLoading(true);
        const token = getToken();
        if (!token) return;

        try {
            // Nota: dateRange ahora es un array de fechas [start, ..., end]
            const queryParams = new URLSearchParams({
                startDate: format(dateRange[0], 'yyyy-MM-dd'),
                endDate: format(dateRange[dateRange.length - 1], 'yyyy-MM-dd')
            }).toString();

            const response = await fetch(`${API_BASE_URL}/incidents?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al cargar incidencias.');
            
            setIncidents(await response.json());
            
        } catch (err: any) {
            addNotification('Error', err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [dateRange, getToken, addNotification]);

    // Recargar cuando cambian fechas (el hook actualiza dateRange automáticamente)
    useEffect(() => {
        loadIncidents();
    }, [loadIncidents]);

    // --- FILTRADO EN CLIENTE (Búsqueda + Filtros Catálogos) ---
    const filteredIncidents = useMemo(() => {
        return incidents.filter(inc => {
            // 1. Búsqueda por texto (Nombre o ID)
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const textMatch = 
                    inc.EmpleadoNombre?.toLowerCase().includes(term) ||
                    inc.EmpleadoCodRef?.toLowerCase().includes(term) ||
                    inc.IncidenciaId?.toString().includes(term);
                if (!textMatch) return false;
            }
            
            // Nota: Los filtros de departamentos/grupos se aplican idealmente en el backend o aquí si tienes los IDs en 'inc'.
            // Como el backend (SP) ya filtra por usuario permitido, aquí asumimos filtrado por fecha es lo principal.
            
            return true;
        });
    }, [incidents, searchTerm]);

    const runAnalysis = async () => {
        if (!dateRange || dateRange.length === 0) return;

        setIsAnalyzing(true);
        const token = getToken();
        try {
            const response = await fetch(`${API_BASE_URL}/incidents/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    startDate: format(dateRange[0], 'yyyy-MM-dd'), 
                    endDate: format(dateRange[dateRange.length - 1], 'yyyy-MM-dd') 
                })
            });
            
            if (!response.ok) throw new Error('Error al ejecutar el análisis.');
            const result = await response.json();
            addNotification('Análisis Completado', `Se detectaron ${result.IncidenciasGeneradas || 0} nuevas discrepancias.`, 'success');
            await loadIncidents();
        } catch (err: any) {
            addNotification('Error de Análisis', err.message, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- MODALES ---
    const handleOpenModal = (incidentId: number) => { setSelectedIncidentId(incidentId); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedIncidentId(null); };
    
    const formatDateSafe = (dateString: string) => {
        if (!dateString) return '-';
        try {
            const cleanDate = dateString.substring(0, 10); 
            const date = new Date(cleanDate + 'T12:00:00'); 
            if (isNaN(date.getTime())) return '-';
            return format(date, 'dd MMM', { locale: es });
        } catch (e) { return '-'; }
    };

    return (
        <div className="space-y-6 animate-fade-in h-full flex flex-col">
            {/* CABECERA Y BOTÓN DE ANÁLISIS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Tablero de Incidencias</h2>
                    <p className="text-slate-500 text-sm">Gestiona discrepancias y excepciones de nómina.</p>
                </div>
                <button 
                    onClick={runAnalysis}
                    disabled={isAnalyzing || isLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all ${isAnalyzing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'}`}
                >
                    {isAnalyzing ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                    {isAnalyzing ? 'Analizando...' : 'Ejecutar Análisis'}
                </button>
            </div>

            {/* BARRA DE HERRAMIENTAS UNIFICADA */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <AttendanceToolbar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filterConfigurations={filterConfigurations}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    rangeLabel={rangeLabel}
                    handleDatePrev={handleDatePrev}
                    handleDateNext={handleDateNext}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                />
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                {filteredIncidents.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400 h-full">
                        <AlertTriangle size={48} className="mb-4 opacity-20" />
                        <p>{incidents.length === 0 ? "No hay incidencias en este periodo." : "No se encontraron resultados con los filtros actuales."}</p>
                    </div>
                ) : (
                    <div className="overflow-auto h-full">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 w-16 text-center">ID</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4">Severidad</th>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Empleado</th>
                                    <th className="p-4">Asignado A</th>
                                    <th className="p-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredIncidents.map((inc) => (
                                    <tr key={inc.IncidenciaId} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 text-center font-mono text-slate-400 group-hover:text-indigo-500 transition-colors">
                                            <div className="flex items-center justify-center gap-1">
                                                <Hash size={12} />{inc.IncidenciaId}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border
                                                ${inc.Estado === 'Nueva' ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
                                                ${inc.Estado === 'Asignada' ? 'bg-purple-50 text-purple-700 border-purple-100' : ''}
                                                ${inc.Estado === 'PorAutorizar' ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
                                                ${inc.Estado === 'Resuelta' ? 'bg-green-50 text-green-700 border-green-100' : ''}
                                                ${inc.Estado === 'Cancelada' ? 'bg-slate-50 text-slate-500 border-slate-200' : ''}
                                            `}>
                                                {inc.Estado}
                                            </span>
                                        </td>
                                        <td className="p-4"><SeverityBadge severity={inc.Severidad} /></td>
                                        <td className="p-4 font-medium text-slate-700">
                                            {formatDateSafe(inc.Fecha)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{inc.EmpleadoNombre}</span>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-wide">{inc.Departamento}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {inc.AsignadoA ? (
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5 text-slate-700">
                                                        <User size={14} className="text-indigo-400"/>
                                                        <span className="text-sm font-medium">{inc.AsignadoA}</span>
                                                    </div>
                                                    {inc.RolAsignado && (
                                                        <span className="text-[10px] text-slate-400 ml-5 bg-slate-100 px-1.5 rounded w-fit">
                                                            {inc.RolAsignado}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic flex items-center gap-1">
                                                    <Shield size={12}/> Sin Asignar
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => handleOpenModal(inc.IncidenciaId)}
                                                className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs hover:underline underline-offset-2 decoration-indigo-200"
                                            >
                                                Gestionar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <IncidentDetailModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                incidentId={selectedIncidentId}
                onRefresh={loadIncidents}
            />
        </div>
    );
};