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
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { statusColorPalette } from '../../config/theme.ts';

export const EstatusAsistenciaPage = () => {
    const { getToken, user, can } = useAuth();
    const { addNotification } = useNotification();
    const [statuses, setStatuses] = useState<AttendanceStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStatus, setEditingStatus] = useState<AttendanceStatus | null>(null);

    const canManage = can('catalogo.estatusAsistencia.manage');
    const canRead = can('catalogo.estatusAsistencia.read');

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

    if (isLoading) return <div className="text-center p-8"><Loader2 className="animate-spin inline-block mr-2" />Cargando catálogo...</div>;
    if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>;

    return (
        <div className="space-y-4">
            
            <div className="flex justify-end">
                {canManage && (
                    <Button onClick={() => handleOpenModal()}>
                        <PlusCircleIcon />
                        Crear Estatus
                    </Button>
                )}
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 text-left font-semibold text-slate-600">ID</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Abreviatura</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Descripción</th>
                            <th className="p-3 text-center font-semibold text-slate-600">Valor Nómina</th>
                            <th className="p-3 text-center font-semibold text-slate-600">Días Futuros</th>
                            <th className="p-3 text-center font-semibold text-slate-600">Asignable</th>
                            <th className="p-3 text-center font-semibold text-slate-600">Activo</th>
                            {canManage && <th className="p-3 text-center font-semibold text-slate-600">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {statuses.map(status => {
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