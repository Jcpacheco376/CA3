// src/features/admin/HorariosPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { API_BASE_URL } from '../../config/api.ts';
import { Plus, Loader2, AlertTriangle, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { HorarioModal } from './HorarioModal.tsx';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
import { Button, Modal } from '../../components/ui/Modal.tsx';

// Componente para el modal de confirmación, siguiendo el patrón de la aplicación
const ConfirmationModal = ({ confirmation, setConfirmation }: { confirmation: any, setConfirmation: (config: any) => void }) => {
    if (!confirmation.isOpen) return null;

    const footer = (
        <>
            <Button variant="secondary" onClick={() => setConfirmation({ isOpen: false })}>Cancelar</Button>
            <Button 
                variant="danger" 
                onClick={() => { 
                    confirmation.onConfirm(); 
                    setConfirmation({ isOpen: false }); 
                }}
            >
                Desactivar
            </Button>
        </>
    );

    return (
        <Modal isOpen={confirmation.isOpen} onClose={() => setConfirmation({ isOpen: false })} title={confirmation.title} footer={footer} size="lg">
            <div className="flex items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <p className="text-sm text-slate-500">{confirmation.message}</p>
                </div>
            </div>
        </Modal>
    );
};

export const HorariosPage = () => {
    const { getToken, can } = useAuth();
    const { addNotification } = useNotification();
    const [horarios, setHorarios] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHorario, setSelectedHorario] = useState<any | null>(null);
    const [confirmation, setConfirmation] = useState<any>({ isOpen: false });

    const canManage = can('catalogo.horarios.manage');
    const canRead = can('catalogo.horarios.read');

    const fetchHorarios = useCallback(async () => {
        if (!canRead) {
            setError("No tienes permiso para ver este catálogo.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        const token = getToken();
        if (!token) {
            setError("Sesión no válida.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/catalogs/schedules`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'No se pudo cargar el catálogo de horarios.');
            }
            const data = await response.json();
            setHorarios(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [getToken, canRead]);

    useEffect(() => {
        fetchHorarios();
    }, [fetchHorarios]);

    const handleOpenModal = (horario: any | null = null) => {
        setSelectedHorario(horario);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedHorario(null);
    };

    const handleSave = () => {
        handleCloseModal();
        fetchHorarios(); // Recargar la lista después de guardar
    };

    const handleDelete = (horario: any) => {
        setConfirmation({
            isOpen: true,
            title: 'Desactivar Horario',
            message: `¿Estás seguro de que quieres desactivar el horario "${horario.Nombre}"? Esta acción no se puede deshacer.`,
            onConfirm: () => executeDelete(horario.HorarioId),
        });
    };

    const executeDelete = async (horarioId: number) => {
        const token = getToken();
        try {
            const response = await fetch(`${API_BASE_URL}/api/catalogs/schedules/${horarioId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'No se pudo desactivar el horario.');
            }
            addNotification('Horario Desactivado', 'El horario ha sido marcado como inactivo.', 'success');
            fetchHorarios();
        } catch (err: any) {
            addNotification('Error', err.message, 'error');
        }
    };
    
    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin mr-2" /> Cargando horarios...</div>;
        }
        if (error) {
            return <div className="text-center p-8 text-red-600 bg-red-50 rounded-lg"><AlertTriangle className="mx-auto mb-2" />{error}</div>;
        }
        return (
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Abreviatura</th>
                            <th scope="col" className="px-6 py-3">Nombre del Horario</th>
                            <th scope="col" className="px-6 py-3 text-center">Tolerancia (min)</th>
                            <th scope="col" className="px-6 py-3 text-center">Estado</th>
                            {canManage && <th scope="col" className="px-6 py-3 text-right">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {horarios.map((horario) => (
                            <tr key={horario.HorarioId} className="bg-white border-b hover:bg-slate-50">
                                <td className="px-6 py-4 font-bold text-slate-900">
                                    <span className="px-2 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: `${horario.ColorUI}20`, color: horario.ColorUI }}>
                                        {horario.Abreviatura}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{horario.Nombre}</td>
                                <td className="px-6 py-4 text-center">{horario.MinutosTolerancia}</td>
                                <td className="px-6 py-4 text-center">
                                    {horario.Activo ? 
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={14} /> Activo</span> :
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={14} /> Inactivo</span>
                                    }
                                </td>
                                {canManage && (
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <Tooltip text="Editar Horario">
                                            <button onClick={() => handleOpenModal(horario)} className="p-2 text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                                                <Edit size={16} />
                                            </button>
                                        </Tooltip>
                                        {horario.Activo && (
                                            <Tooltip text="Desactivar Horario">
                                                <button onClick={() => handleDelete(horario)} className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    if (!canRead) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 text-red-600 bg-red-50 rounded-lg">
                    <AlertTriangle className="mx-auto mb-2 h-10 w-10" />
                    <h2 className="text-lg font-semibold">Acceso Denegado</h2>
                    <p>No tienes permiso para ver este catálogo. Contacta a un administrador.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Catálogo de Horarios</h1>
                    <p className="text-slate-500 mt-1">Define y administra los horarios de trabajo de la empresa.</p>
                </div>
                {canManage && (
                    <Button onClick={() => handleOpenModal(null)}>
                        <Plus className="mr-2" size={18} />
                        Nuevo Horario
                    </Button>
                )}
            </header>

            {renderContent()}

            <ConfirmationModal confirmation={confirmation} setConfirmation={setConfirmation} />

            {isModalOpen && (
                <HorarioModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    horario={selectedHorario}
                />
            )}
        </div>
    );
};

