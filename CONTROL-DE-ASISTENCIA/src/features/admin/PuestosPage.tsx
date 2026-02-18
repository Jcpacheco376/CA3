// src/features/admin/PuestosPage.tsx
import { API_BASE_URL } from '../../config/api.ts';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip.tsx';
import { useAuth } from '../../features/auth/AuthContext.tsx';
import { PencilIcon, PlusCircleIcon } from '../../components/ui/Icons.tsx';
import { Button } from '../../components/ui/Modal.tsx';
import { PuestoModal } from './PuestoModal.tsx';
import { CheckCircle, XCircle, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Search, X } from 'lucide-react';
import { GenericTableSkeleton } from '../../components/ui/GenericTableSkeleton';

export const PuestosPage = () => {
    const { can, getToken, user } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'Nombre',
        direction: 'asc'
    });

    const canManage = can('catalogo.puestos.manage');
    const canRead = can('catalogo.puestos.read');

    const SCROLL_THRESHOLD = 100;

    const fetchData = useCallback(async () => {
        if (!canRead) {
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
            const res = await fetch(`${API_BASE_URL}/catalogs/puestos/management`, { headers });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al cargar los datos.');
            }
            setData(await res.json());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [getToken, canRead]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, fetchData]);

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
        handleCloseModal();
    };

    const filteredData = useMemo(() => {
        let result = [...data];
        if (searchTerm.trim()) {
            const lowercasedFilter = searchTerm.toLowerCase();
            result = result.filter(item =>
                (item.Nombre?.toLowerCase().includes(lowercasedFilter)) ||
                (item.PuestoId?.toString().toLowerCase().includes(lowercasedFilter))
            );
        }
        return result.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, searchTerm, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />;
    };

    const useFixedLayout = filteredData.length > SCROLL_THRESHOLD;

    const renderContent = () => {
        if (isLoading) return <GenericTableSkeleton columns={4} rows={10} />;
        if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>;

        return (
            <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${useFixedLayout ? 'flex-1 flex flex-col min-h-0' : ''}`}>
                <div className={useFixedLayout ? 'overflow-auto flex-1' : ''}>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('PuestoId')}>
                                    <div className="flex items-center gap-2">ID {getSortIcon('PuestoId')}</div>
                                </th>
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('Nombre')}>
                                    <div className="flex items-center gap-2">Nombre {getSortIcon('Nombre')}</div>
                                </th>
                                <th className="p-3 text-center font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('Activo')}>
                                    <div className="flex items-center justify-center gap-2">Estado {getSortIcon('Activo')}</div>
                                </th>
                                {canManage && <th className="p-3 text-center font-semibold text-slate-600">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(item => (
                                <tr key={item.PuestoId} className="border-t border-slate-200 hover:bg-slate-50">
                                    <td className="p-3 font-mono text-slate-500">{item.PuestoId}</td>
                                    <td className="p-3 font-medium text-slate-800">{item.Nombre}</td>
                                    <td className="p-3 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${item.Activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.Activo ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                            {item.Activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    {canManage && (
                                        <td className="p-3 text-center">
                                            <Tooltip text="Editar Puesto">
                                                <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-500 hover:text-[--theme-500] rounded-full hover:bg-slate-100">
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
        <div className={`space-y-4 ${useFixedLayout ? 'h-full flex flex-col overflow-hidden' : ''}`}>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Puestos</h2>
                <p className="text-slate-500 text-sm">Gestiona los cargos y roles laborales disponibles.</p>
            </div>

            {/* Buscador y Botón "Crear" */}
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
                        Crear Puesto
                    </Button>
                )}
            </div>

            {renderContent()}

            {canManage && isModalOpen && (
                <PuestoModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    puesto={editingItem}
                />
            )}
        </div>
    );
};