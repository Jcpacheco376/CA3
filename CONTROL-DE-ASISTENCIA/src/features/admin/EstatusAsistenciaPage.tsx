// src/features/admin/EstatusAsistenciaPage.tsx
import React, { useState, useEffect, useCallback } from 'react'; 
import { useAuth } from '../auth/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { API_BASE_URL } from '../../config/api.ts';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip.tsx';
import { Button } from '../../components/ui/Modal.tsx';
import { PlusCircleIcon, PencilIcon } from '../../components/ui/Icons.tsx';
import { AttendanceStatus } from '../../types/index.ts';
import { EstatusAsistenciaModal } from './EstatusAsistenciaModal.tsx';
import { CheckCircle, XCircle, Loader2, Search, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { statusColorPalette } from '../../config/theme.ts';

export const EstatusAsistenciaPage = () => {
    const { getToken, user, can } = useAuth();
    const { addNotification } = useNotification();
    const [statuses, setStatuses] = useState<AttendanceStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStatus, setEditingStatus] = useState<AttendanceStatus | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'Abreviatura',
        direction: 'asc'
    });

    const canManage = can('catalogo.estatusAsistencia.manage');
    const canRead = can('catalogo.estatusAsistencia.read');

    const SCROLL_THRESHOLD = 100;

    const fetchData = useCallback(async () => {
           if (!canRead) {
            setError("No tienes permiso para ver este catálogo.");
            setIsLoading(false);
            return;
        }       
        const token = getToken();
        if (!token) { setError("Sesión no válida."); return; }
        
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/catalogs/attendance-statuses/management`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error((await res.json()).message);
            setStatuses(await res.json());
        } catch (err: any) { setError(err.message); }
        finally { setIsLoading(false); }
    }, [canRead, getToken]); 

    useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

    const handleOpenModal = (status: AttendanceStatus | null = null) => {
        setEditingStatus(status);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingStatus(null);
    };

    const handleSave = async (status: AttendanceStatus) => {
        const token = getToken();
        try {
            const response = await fetch(`${API_BASE_URL}/catalogs/attendance-statuses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(status),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            addNotification('Operación Exitosa', 'Estatus guardado correctamente.', 'success');
            await fetchData();
            handleCloseModal();
        } catch (err: any) {
            addNotification('Error al Guardar', err.message, 'error');
        }
    };

    const filteredStatuses = React.useMemo(() => {
        let result = [...statuses];
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(s => 
                s.Abreviatura.toLowerCase().includes(lower) || 
                s.Descripcion.toLowerCase().includes(lower)
            );
        }
        return result.sort((a, b) => {
            const aValue = (a as any)[sortConfig.key];
            const bValue = (b as any)[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [statuses, searchTerm, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />;
    };

    const useFixedLayout = filteredStatuses.length > SCROLL_THRESHOLD;

    if (isLoading) return <div className="text-center p-8 h-full flex items-center justify-center"><Loader2 className="animate-spin inline-block mr-2" />Cargando catálogo...</div>;
    if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>;

    return (
        <div className={`space-y-4 ${useFixedLayout ? 'h-full flex flex-col overflow-hidden' : ''}`}>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Estatus de Asistencia</h2>
                <p className="text-slate-500 text-sm">Define los códigos y reglas para incidencias y asistencia.</p>
            </div>
            
            <div className="flex justify-between items-center">
                <div className="relative group w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-[--theme-500] transition-colors" size={16} />
                    <input
                        type="text"
                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 
                                focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent 
                                transition-all shadow-sm"
                        placeholder="Buscar empleado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>
                {canManage && (
                    <Button onClick={() => handleOpenModal()}>
                        <PlusCircleIcon />
                        Crear Estatus
                    </Button>
                )}
            </div>
            <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${useFixedLayout ? 'flex-1 flex flex-col min-h-0' : ''}`}>
                <div className={useFixedLayout ? 'overflow-auto flex-1' : 'overflow-x-auto'}>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('EstatusId')}>
                                <div className="flex items-center gap-2">ID {getSortIcon('EstatusId')}</div>
                            </th>
                            <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('Abreviatura')}>
                                <div className="flex items-center gap-2">Abreviatura {getSortIcon('Abreviatura')}</div>
                            </th>
                            <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('Descripcion')}>
                                <div className="flex items-center gap-2">Descripción {getSortIcon('Descripcion')}</div>
                            </th>
                            <th className="p-3 text-center font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('ValorNomina')}>
                                <div className="flex items-center justify-center gap-2">Valor Nómina {getSortIcon('ValorNomina')}</div>
                            </th>
                            <th className="p-3 text-center font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('DiasRegistroFuturo')}>
                                <div className="flex items-center justify-center gap-2">Días Futuros {getSortIcon('DiasRegistroFuturo')}</div>
                            </th>
                            <th className="p-3 text-center font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('VisibleSupervisor')}>
                                <div className="flex items-center justify-center gap-2">Asignable {getSortIcon('VisibleSupervisor')}</div>
                            </th>
                            <th className="p-3 text-center font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('Activo')}>
                                <div className="flex items-center justify-center gap-2">Activo {getSortIcon('Activo')}</div>
                            </th>
                            {canManage && <th className="p-3 text-center font-semibold text-slate-600">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStatuses.map(status => {
                            // --- MODIFICACIÓN CRÍTICA: Obtener clases del mapa ---
                            // Usamos el mapa statusColorPalette que ya tiene las clases completas
                            const colorTheme = statusColorPalette[status.ColorUI] || statusColorPalette.slate;
                            // --- FIN MODIFICACIÓN ---

                            return (
                                <tr key={status.EstatusId}>
                                    <td className="p-3 font-mono text-slate-500">{status.EstatusId}</td>
                                    <td className="p-3 font-bold">
                                        {/* Usamos la propiedad bgText del tema */}
                                        <span className={`px-2 py-1 rounded-full ${colorTheme.bgText}`}>
                                            {status.Abreviatura}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-700">{status.Descripcion}</td>
                                    <td className="p-3 text-center font-mono">{status.ValorNomina.toFixed(2)}</td>
                                    <td className="p-3 text-center font-mono">
                                        {status.DiasRegistroFuturo > 0 ? status.DiasRegistroFuturo : 'N/A'}
                                    </td>
                                    <td className="p-3 text-center">{status.VisibleSupervisor ? 'Sí' : 'No'}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.Activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {status.Activo ? <CheckCircle size={14} className="inline-block -mt-0.5" /> : <XCircle size={14} className="inline-block -mt-0.5" />}
                                            {status.Activo ? ' Activo' : ' Inactivo'}
                                        </span>
                                    </td>
                                    {canManage && (
                                        <td className="p-3 text-center">
                                            <Tooltip text="Editar Estatus">
                                                <button onClick={() => handleOpenModal(status)} className="p-2 text-slate-500 hover:text-[--theme-500] rounded-full hover:bg-slate-100">
                                                    <PencilIcon />
                                                </button>
                                            </Tooltip>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            </div>
             {canManage && isModalOpen && (
                 <EstatusAsistenciaModal 
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    status={editingStatus}
                    statuses={statuses}
                    onSwitch={(newStatus) => setEditingStatus(newStatus)}
                />
             )}
        </div>
    );
};