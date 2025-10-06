// src/features/admin/GruposNominaPage.tsx
import { API_BASE_URL } from '../../config/api.ts';
import React, { useState, useEffect } from 'react';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import { PencilIcon, PlusCircleIcon } from '../../components/ui/Icons.tsx';
import { Button } from '../../components/ui/Modal.tsx';
import { GrupoNominaModal } from './GrupoNominaModal.tsx';

export const GruposNominaPage = () => {
    const { can, getToken, user } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const fetchData = async () => {
        const token = getToken();
        if (!token) {
            setError("Sesión no válida.");
            setIsLoading(false);
            return;
        }
        const headers = { 'Authorization': `Bearer ${token}` };

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/grupos-nomina/management`, { headers });
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
    };

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, getToken]);

    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleSave = async (item: any) => {
        const token = getToken();
        if (!token) {
            setError("Su sesión ha expirado.");
            handleCloseModal();
            return;
        }
        try {
            await fetch(`${API_BASE_URL}/api/grupos-nomina`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(item),
            });
            await fetchData();
        } catch (err) {
            console.error("Error al guardar:", err);
        }
        handleCloseModal();
    };

    if (isLoading) return <div className="text-center p-8">Cargando grupos de nómina...</div>;
    if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>;

    return (
        <div>
            <header className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                    <h1 className="text-3xl font-bold text-slate-900">Catálogo de Grupos de Nómina</h1>
                    <Tooltip text="Lista de grupos de nómina registrados en el sistema de origen.">
                        <span><InfoIcon /></span>
                    </Tooltip>
                </div>
                {can('catalog.manage') && (
                    <Button onClick={() => handleOpenModal()}>
                        <PlusCircleIcon />
                        Crear Grupo
                    </Button>
                )}
            </header>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 text-left font-semibold text-slate-600">ID</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Nombre</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Abreviatura</th>
                            <th className="p-3 text-center font-semibold text-slate-600">Status</th>
                            {can('catalog.manage') && <th className="p-3 text-center font-semibold text-slate-600">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(item => (
                            <tr key={item.grupo_nomina} className="border-t border-slate-200">
                                <td className="p-3 font-mono text-slate-500">{item.grupo_nomina.trim()}</td>
                                <td className="p-3 font-medium text-slate-800">{item.nombre.trim()}</td>
                                <td className="p-3 text-slate-600">{item.abreviatura?.trim()}</td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status.trim().toUpperCase() === 'ALTA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {item.status.trim()}
                                    </span>
                                </td>
                                {can('catalog.manage') && (
                                    <td className="p-3 text-center">
                                        <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-500 hover:text-[--theme-500] rounded-full hover:bg-slate-100">
                                            <PencilIcon />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <GrupoNominaModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSave}
                grupoNomina={editingItem}
            />
        </div>
    );
};

