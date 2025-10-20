// src/features/admin/GruposNominaPage.tsx
import { API_BASE_URL } from '../../config/api.ts';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import { PencilIcon, PlusCircleIcon } from '../../components/ui/Icons.tsx';
import { Button } from '../../components/ui/Modal.tsx';
import { GrupoNominaModal } from './GrupoNominaModal.tsx';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const GruposNominaPage = () => {
    const { can, getToken, user } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const canManage = can('catalogo.gruposNomina.manage');
    const canRead = can('catalogo.gruposNomina.read');

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
            const res = await fetch(`${API_BASE_URL}/catalogs/grupos-nomina/management`, { headers });
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
    }, [user, getToken, fetchData]);

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

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin mr-2" /> Cargando grupos de nómina...</div>;
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
                        {data.map(item => (
                            <tr key={item.GrupoNominaId} className="border-t border-slate-200 hover:bg-slate-50">
                                <td className="p-3 font-mono text-slate-500">{item.GrupoNominaId}</td>
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
                                        <Tooltip text="Editar Grupo">
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
        <div>
            <header className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                    <h1 className="text-3xl font-bold text-slate-900">Catálogo de Grupos de Nómina</h1>
                    <Tooltip text="Lista de grupos de nómina registrados en el sistema.">
                        <span><InfoIcon /></span>
                    </Tooltip>
                </div>
                {canManage && (
                    <Button onClick={() => handleOpenModal()}>
                        <PlusCircleIcon />
                        Crear Grupo
                    </Button>
                )}
            </header>

            {renderContent()}

            {isModalOpen && (
                <GrupoNominaModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    grupoNomina={editingItem}
                />
            )}
        </div>
    );
};

