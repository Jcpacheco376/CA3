import { API_BASE_URL } from '../../config/api';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { PencilIcon, PlusCircleIcon, TrashIcon } from '../../components/ui/Icons';
import { Button } from '../../components/ui/Modal';
import { EmpleadoModal } from './EmpleadoModal';
import { CheckCircle, XCircle, Loader2, Search, X, ArrowUpDown, ArrowUp, ArrowDown, User, Briefcase, MapPin } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';
import { GenericTableSkeleton } from '../../components/ui/GenericTableSkeleton';

export const EmpleadosPage = () => {
    const { can, getToken, user } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'NombreCompleto',
        direction: 'asc'
    });

    const canManage = can('catalogo.empleados.manage');
    const canRead = can('catalogo.empleados.read');

    // Reuse patterns from UserModal/DepartamentosPage


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
            const res = await fetch(`${API_BASE_URL}/employees`, { headers });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al cargar los empleados.');
            }
            setData(await res.json());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [getToken, canRead, canManage]);

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
    };

    const handleDelete = async (employeeId: number) => {
        if (!window.confirm("¿Estás seguro de desactivar este empleado?")) return;

        const token = getToken();
        try {
            const res = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Error al eliminar");
            fetchData();
        } catch (err) {
            alert("Error al eliminar el empleado");
        }
    }

    const filteredData = useMemo(() => {
        let result = [...data];
        if (searchTerm.trim()) {
            const lowercasedFilter = searchTerm.toLowerCase();
            result = result.filter(item =>
                (item.NombreCompleto?.toLowerCase().includes(lowercasedFilter)) ||
                (item.CodRef?.toString().toLowerCase().includes(lowercasedFilter)) ||
                (item.DepartamentoNombre?.toLowerCase().includes(lowercasedFilter))
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

    const renderContent = () => {
        if (isLoading) return <GenericTableSkeleton columns={6} rows={8} />;
        if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>;

        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('CodRef')}>
                                    <div className="flex items-center gap-2">Código {getSortIcon('CodRef')}</div>
                                </th>
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('NombreCompleto')}>
                                    <div className="flex items-center gap-2">Nombre {getSortIcon('NombreCompleto')}</div>
                                </th>
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors hidden md:table-cell" onClick={() => handleSort('DepartamentoNombre')}>
                                    <div className="flex items-center gap-2">Departamento {getSortIcon('DepartamentoNombre')}</div>
                                </th>
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors hidden lg:table-cell" onClick={() => handleSort('PuestoNombre')}>
                                    <div className="flex items-center gap-2">Puesto {getSortIcon('PuestoNombre')}</div>
                                </th>
                                <th className="p-3 text-center font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('Activo')}>
                                    <div className="flex items-center justify-center gap-2">Estado {getSortIcon('Activo')}</div>
                                </th>
                                {canManage && <th className="p-3 text-center font-semibold text-slate-600">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(item => (
                                <tr key={item.EmpleadoId} className="border-t border-slate-200 hover:bg-slate-50">
                                    <td className="p-3 font-mono text-slate-500">{item.CodRef}</td>
                                    <td className="p-3 font-medium text-slate-800">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden">
                                                {item.Imagen
                                                    ? <img src={`data:image/jpeg;base64,${arrayBufferToBase64(item.Imagen)}`} alt="" className="w-full h-full object-cover" />
                                                    : (item.NombreCompleto?.[0] || '?')}
                                            </div>
                                            {item.NombreCompleto}
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-600 hidden md:table-cell">
                                        <div className="flex items-center gap-1.5"><Briefcase size={14} className="text-slate-400" /> {item.DepartamentoNombre || '-'}</div>
                                    </td>
                                    <td className="p-3 text-slate-600 hidden lg:table-cell">{item.PuestoNombre || '-'}</td>
                                    <td className="p-3 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${item.Activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.Activo ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                            {item.Activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    {canManage && (
                                        <td className="p-3 text-center flex items-center justify-center gap-2">
                                            <Tooltip text="Editar Empleado">
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

    // Helper for listing image (repeating logic from modal, ideally utility)
    const arrayBufferToBase64 = (buffer: any) => {
        if (!buffer || !buffer.data) return null;
        let binary = '';
        const bytes = new Uint8Array(buffer.data);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Empleados</h2>
                <p className="text-slate-500 text-sm">Gestión del personal de la empresa.</p>
            </div>

            <div className="flex justify-between items-center">
                <div className="relative group w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-[--theme-500] transition-colors" size={16} />
                    <input
                        type="text"
                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 
                                focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent 
                                transition-all shadow-sm"
                        placeholder="Buscar por nombre, código..."
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
                        Nuevo Empleado
                    </Button>
                )}
            </div>

            {renderContent()}

            {isModalOpen && (
                <EmpleadoModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    empleado={editingItem}
                />
            )}
        </div>
    );
};
