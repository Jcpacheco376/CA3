import { API_BASE_URL } from '../../config/api';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { PencilIcon, PlusCircleIcon } from '../../components/ui/Icons';
import { Button } from '../../components/ui/Modal';
import { EmpleadoModal } from './EmpleadoModal';
import { CheckCircle, XCircle, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Briefcase, Clock, Smartphone, Fingerprint, Calendar, Sun, Moon, AlertCircle, GripVertical } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';
import { GenericTableSkeleton } from '../../components/ui/GenericTableSkeleton';
import { EmployeeStats } from '../../types';
import { SmartStatsHeader } from './components/employee-management/SmartStatsHeader';

export const EmpleadosPage = () => {
    const { can, getToken, user } = useAuth();
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [data, setData] = useState<any[]>([]);
    const [stats, setStats] = useState<EmployeeStats | null>(null);
    const [activeSmartFilter, setActiveSmartFilter] = useState<string | null>(null);
    const [showInactive, setShowInactive] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'NombreCompleto',
        direction: 'asc'
    });
    const [employeeColumnWidth, setEmployeeColumnWidth] = useState(() => {
        try { const saved = localStorage.getItem('employees_col_width'); return saved ? Math.max(250, Math.min(parseInt(saved), 600)) : 300; } catch { return 300; }
    });

    const canManage = can('catalogo.empleados.manage');
    const canRead = can('catalogo.empleados.read');

    const fetchData = useCallback(async () => {
        if (!canRead && !canManage) {
            setError("No tienes permiso para ver este catálogo.");
            setIsLoading(false);
            return;
        }
        const token = getToken();
        if (!token) {
            setError("Sesión no válida.");
            setIsLoading(false);
            return;
        }
        const headers = { 'Authorization': `Bearer ${token}` };

        setIsLoading(true);
        setError(null);
        try {
            // Fetch List AND Stats in parallel
            // Append includeInactive query param based on showInactive state
            const [resList, resStats] = await Promise.all([
                fetch(`${API_BASE_URL}/employees?includeInactive=${showInactive}`, { headers }),
                fetch(`${API_BASE_URL}/employees/stats`, { headers })
            ]);

            if (!resList.ok || !resStats.ok) {
                throw new Error('Error al cargar datos.');
            }

            const list = await resList.json();
            const statsData = await resStats.json();

            // Calculate SinFoto and TotalInactivos manually from the list
            statsData.SinFoto = list.filter((e: any) => e.Activo && !e.Imagen).length; // Only active without photo? Or all? Usually Active.
            statsData.TotalInactivos = list.filter((e: any) => !e.Activo).length;

            setData(list);
            setStats(statsData);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [getToken, canRead, canManage, showInactive]); // Re-fetch when showInactive changes

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, fetchData]); // fetchData now depends on showInactive, so this will run when showInactive changes

    const handleOpenModal = (item: any = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleSave = () => {
        fetchData();
    };


    const handleSmartFilterClick = (filterType: string) => {
        if (filterType === 'all') {
            // Toggle Inactive View on "All" click
            setShowInactive(prev => !prev);
            setActiveSmartFilter(null); // Ensure no specific filter is active
        } else {
            // For any other filter, enforce Active Only (as requested)
            setShowInactive(false);

            if (activeSmartFilter === filterType) {
                setActiveSmartFilter(null); // Toggle off specific filter
            } else {
                setActiveSmartFilter(filterType);
            }
        }
    };

    // --- Filtering Logic ---
    const filteredData = useMemo(() => {
        // Debugging Activo values
        if (data.length > 0) {
            console.log("Sample Employee Activo:", data[0].Activo, typeof data[0].Activo);
        }
        let result = [...data];

        // 0. Base Filter: Active or All
        if (!showInactive) {
            result = result.filter(item => item.Activo);
        }
        // If showInactive is true, we keep everyone (Active + Inactive)

        // 1. Apply Smart Chips Filter
        if (activeSmartFilter) {
            switch (activeSmartFilter) {
                case 'no_schedule':
                    result = result.filter(item => !item.HorarioIdPredeterminado);
                    break;
                case 'rotative':
                    result = result.filter(item => item.HorarioIdPredeterminado === 2); // Corrected property access and value
                    break;
                case 'no_device':
                    result = result.filter(item => (!item.ZonasAsignadas || item.ZonasAsignadas === 0));
                    break;
                case 'no_photo':
                    result = result.filter(item => !item.Imagen);
                    break;
            }
        }

        // 2. Apply Text Search
        if (searchTerm.trim()) {
            const lowercasedFilter = searchTerm.toLowerCase();
            result = result.filter(item =>
                (item.NombreCompleto?.toLowerCase().includes(lowercasedFilter)) ||
                (item.CodRef?.toString().toLowerCase().includes(lowercasedFilter)) ||
                (item.DepartamentoNombre?.toLowerCase().includes(lowercasedFilter))
            );
        }

        // 3. Sorting
        return result.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, searchTerm, sortConfig, activeSmartFilter, showInactive]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        document.body.classList.add('select-none', 'cursor-col-resize');
        const startX = e.clientX;
        const startWidth = employeeColumnWidth;
        const container = tableContainerRef.current;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            // Synchronous update for responsiveness
            const newWidth = Math.max(200, Math.min(startWidth + (moveEvent.clientX - startX), 600));
            if (container) {
                container.style.setProperty('--employee-col-width', `${newWidth}px`);
            }
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            document.body.classList.remove('select-none', 'cursor-col-resize');
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            const finalWidth = Math.max(200, Math.min(startWidth + (upEvent.clientX - startX), 600));
            setEmployeeColumnWidth(finalWidth);
            localStorage.setItem('employees_col_width', finalWidth.toString());
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp, { once: true });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />;
    };

    const renderContent = () => {
        if (isLoading) return <GenericTableSkeleton columns={6} rows={8} />;
        if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>;

        return (
            <div ref={tableContainerRef} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0" style={{ '--employee-col-width': `${employeeColumnWidth}px` } as React.CSSProperties}>
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm relative table-fixed">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer w-20 min-w-[5rem]" onClick={() => handleSort('CodRef')}>
                                    <div className="flex items-center gap-1">ID {getSortIcon('CodRef')}</div>
                                </th>
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer relative group select-none" style={{ width: 'var(--employee-col-width)', willChange: 'width' }} onClick={() => handleSort('NombreCompleto')}>
                                    <div className="flex items-center gap-1">Empleado {getSortIcon('NombreCompleto')}</div>
                                    <div onMouseDown={handleResizeMouseDown} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-slate-200/50 z-20"><GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100" /></div>
                                </th>
                                <th className="p-3 text-left font-semibold text-slate-600 hidden md:table-cell w-64">Info Laboral</th>
                                <th className="p-3 text-left font-semibold text-slate-600 hidden lg:table-cell">Horario</th>
                                <th className="p-3 text-center font-semibold text-slate-600 hidden xl:table-cell">Acceso</th>
                                <th className="p-3 text-center font-semibold text-slate-600">Estado</th>
                                {canManage && <th className="p-3 text-center font-semibold text-slate-600">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(item => (
                                <tr key={item.EmpleadoId} className="border-t border-slate-200 hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-mono text-slate-500 font-semibold">{item.CodRef}</td>
                                    <td className="p-3 font-medium text-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden text-clip whitespace-nowrap shrink-0 cursor-pointer">
                                                {item.TieneFoto
                                                    ? (
                                                        <Tooltip
                                                            text={
                                                                <div className="relative group p-1">
                                                                    <style>
                                                                        {`
                                                                            @keyframes magnify {
                                                                                0% { transform: scale(0.9); opacity: 0; }
                                                                                100% { transform: scale(1.05); opacity: 1; }
                                                                            }
                                                                            .animate-magnify {
                                                                                animation: magnify 0.2s ease-out forwards;
                                                                            }
                                                                        `}
                                                                    </style>
                                                                    <div className="absolute inset-0 bg-black/20 rounded-full blur-xl transform scale-90 translate-y-4 animate-magnify"></div>
                                                                    <img
                                                                        src={`${API_BASE_URL}/employees/${item.EmpleadoId}/photo?token=${getToken()}`}
                                                                        alt={item.NombreCompleto}
                                                                        className="relative w-48 h-48 rounded-full object-cover border-4 border-white shadow-2xl animate-magnify"
                                                                    />
                                                                </div>
                                                            }
                                                            className="p-0 bg-transparent border-none shadow-none overflow-visible"
                                                            withArrow={false}
                                                            placement="right"
                                                            offset={20}
                                                        >
                                                            <img src={`${API_BASE_URL}/employees/${item.EmpleadoId}/photo?token=${getToken()}`} alt="" className="w-full h-full object-cover transform transition-transform duration-300 hover:scale-110" loading="lazy" />
                                                        </Tooltip>
                                                    )
                                                    : (item.NombreCompleto?.[0] || '?')}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="font-semibold text-slate-700 leading-snug" title={item.NombreCompleto}>{item.NombreCompleto}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Info Laboral */}
                                    <td className="p-3 text-slate-600 hidden md:table-cell">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                                                <Briefcase size={12} className="text-slate-400" /> {item.DepartamentoNombre || 'Sin Depto.'}
                                            </div>
                                            <div className="text-xs text-slate-500 pl-4">{item.PuestoNombre || 'Sin Puesto'}</div>
                                        </div>
                                    </td>

                                    {/* Horario */}
                                    <td className="p-3 text-slate-600 hidden lg:table-cell">
                                        <div className="flex flex-col gap-1">
                                            {item.HorarioNombre ? (
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
                                                    <Clock size={12} />
                                                    {item.HorarioNombre}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Sin Horario</div>
                                            )}

                                            <div className="flex items-center gap-2 pl-4">
                                                {item.EsRotativo && (
                                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">
                                                        Rotativo
                                                    </span>
                                                )}
                                                {item.Turno && (
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        {item.Turno === 'M' ? <Sun size={10} /> : <Moon size={10} />}
                                                        {item.Turno === 'M' ? 'Matutino' : 'Nocturno'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Acceso */}
                                    <td className="p-3 text-center hidden xl:table-cell">
                                        <div className="flex flex-col items-center gap-1">
                                            {(() => {
                                                // 1. Try to parse backend JSON (new source of truth)
                                                let zones: any[] = [];
                                                try {
                                                    if (item.Zonas) {
                                                        zones = JSON.parse(item.Zonas);
                                                    }
                                                } catch (e) {
                                                    console.error("Error parsing zones JSON", e);
                                                }

                                                // 2. Determine Names List
                                                const zoneNamesList = zones.length > 0
                                                    ? zones.map(z => z.Nombre)
                                                    : (item.ZonasNombres ? item.ZonasNombres.split(',') :
                                                        (item.Dispositivos && item.Dispositivos.length > 0
                                                            ? Array.from(new Set(item.Dispositivos.map((d: any) => d.ZonaNombre)))
                                                            : []));

                                                // 3. Determine Count
                                                const zoneCount = zones.length || item.ZonasAsignadas || (item.Dispositivos?.length || 0);

                                                // 4. Tooltip Content (Rich)
                                                const tooltipContent = (
                                                    <div className="flex flex-col gap-1 text-xs">
                                                        <div className="font-semibold border-b border-slate-600 pb-1 mb-1 text-slate-300">
                                                            {zoneCount} Zonas Asignadas:
                                                        </div>
                                                        {zoneNamesList.length > 0 ? (
                                                            zoneNamesList.map((name: string, idx: number) => (
                                                                <div key={idx} className="whitespace-nowrap">• {name.trim()}</div>
                                                            ))
                                                        ) : (
                                                            <div className="italic text-slate-400">Sin nombres disponibles</div>
                                                        )}
                                                    </div>
                                                );

                                                if (zoneCount === 0) return <span className="text-xs text-orange-300">-</span>;

                                                return (
                                                    <Tooltip text={tooltipContent}>
                                                        <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-medium border border-indigo-200 shadow-sm hover:bg-indigo-100 transition-colors cursor-default">
                                                            <Fingerprint size={13} />
                                                            <span>{zoneCount}</span>
                                                        </span>
                                                    </Tooltip>
                                                );
                                            })()}
                                        </div>
                                    </td>

                                    {/* Estado */}
                                    <td className="p-3 text-center">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${item.Activo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {item.Activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>

                                    {canManage && (
                                        <td className="p-3 text-center">
                                            <Tooltip text="Editar">
                                                <button onClick={() => handleOpenModal(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                                                    <PencilIcon />
                                                </button>
                                            </Tooltip>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 flex flex-col min-h-[calc(100vh-250px)] p-1">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Empleados</h2>
                    <span>Gestión integral del personal.</span>

                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="relative group w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-[--theme-500] transition-colors" size={16} />
                        <input
                            type="text"
                            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent transition-all shadow-sm"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <SmartStatsHeader
                        stats={stats}
                        isLoading={isLoading}
                        onFilterClick={handleSmartFilterClick}
                        activeFilter={activeSmartFilter}
                        showInactive={showInactive}
                    />

                </div>
                {canManage && (
                    <Button onClick={() => handleOpenModal()}>
                        <PlusCircleIcon />
                        Nuevo Empleado
                    </Button>
                )}
            </div>

            {renderContent()}

            {
                isModalOpen && (
                    <EmpleadoModal
                        isOpen={isModalOpen}
                        onClose={handleCloseModal}
                        onSave={handleSave}
                        empleado={editingItem}
                    />
                )
            }
        </div >
    );
};
