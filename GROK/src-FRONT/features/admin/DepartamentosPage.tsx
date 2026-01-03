// src/features/admin/DepartamentosPage.tsx
import { API_BASE_URL } from '../../config/api.ts';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip.tsx';
import { useAuth } from '../../features/auth/AuthContext.tsx';
import { PencilIcon, PlusCircleIcon } from '../../components/ui/Icons.tsx';
import { Button } from '../../components/ui/Modal.tsx';
import { DepartamentoModal } from './DepartamentoModal.tsx';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const DepartamentosPage = () => {
    const { can, getToken, user } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const canManage = can('catalogo.departamentos.manage');
    const canRead = can('catalogo.departamentos.read');

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
            const res = await fetch(`${API_BASE_URL}/catalogs/departamentos/management`, { headers });
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
        if (!searchTerm.trim()) return data;
        const lowercasedFilter = searchTerm.toLowerCase();
        return data.filter(item =>
            (item.Nombre?.toLowerCase().includes(lowercasedFilter)) ||
            (item.DepartamentoId?.toString().toLowerCase().includes(lowercasedFilter))
        );
    }, [data, searchTerm]);

    const renderContent = () => {
        if (isLoading) return <div className="text-center p-8 flex justify-center items-center"><Loader2 className="animate-spin mr-2"/>Cargando departamentos...</div>;
        if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>;

        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 text-left font-semibold text-slate-600">ID</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Nombre</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Abreviatura</th>
                            <th className="p-3 text-center font-semibold text-slate-600">Estado</th>
                            {canManage && <th className="p-3 text-center font-semibold text-slate-600">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(item => (
                            <tr key={item.DepartamentoId} className="border-t border-slate-200 hover:bg-slate-50">
                                <td className="p-3 font-mono text-slate-500">{item.DepartamentoId}</td>
                                <td className="p-3 font-medium text-slate-800">{item.Nombre}</td>
                                <td className="p-3 text-slate-600">{item.Abreviatura}</td>
                                <td className="p-3 text-center">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${item.Activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {item.Activo ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                        {item.Activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                {canManage && (
                                    <td className="p-3 text-center">
                                        <Tooltip text="Editar Departamento">
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
        );
    };

    return (
        <div className="space-y-4">
            {/* <header className="mb-6">
                <div className="flex items-center space-x-3">
                    <h1 className="text-3xl font-bold text-slate-900">Catálogo de Departamentos</h1>
                    <Tooltip text="Lista de departamentos registrados en el sistema.">
                        <span><InfoIcon /></span>
                    </Tooltip>
                </div>
            </header> */}

            <div className="flex justify-between items-center mb-4">
                <div className="max-w-xs">
                     <input
                        type="text"
                        placeholder="Buscar por Nombre o ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full  pl-4 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--theme-500]"
                    />
                </div>
                {canManage && (
                    <Button onClick={() => handleOpenModal()}>
                        <PlusCircleIcon />
                        Crear Departamento
                    </Button>
                )}
            </div>

            {renderContent()}

            {isModalOpen && (
                <DepartamentoModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    departamento={editingItem}
                />
            )}
        </div>
    );
};
