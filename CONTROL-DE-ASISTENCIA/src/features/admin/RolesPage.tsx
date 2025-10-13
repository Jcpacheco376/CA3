// src/features/admin/RolesPage.tsx
import React, { useState, useEffect } from 'react';
import { Role, Permission } from '../../types';
import { PlusCircleIcon, PencilIcon } from '../../components/ui/Icons';
import { RoleModal } from './RoleModal';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip';
import { Button } from '../../components/ui/Modal';
import { getFullPermissionTranslation } from '../../utils/permissions';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { API_BASE_URL } from '../../config/api';

export const RolesPage = () => {
    const { getToken, user } = useAuth();
    const { addNotification } = useNotification();
    const [roles, setRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

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
            const [rolesResponse, permissionsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/roles`, { headers }),
                fetch(`${API_BASE_URL}/api/roles/permissions`, { headers })
            ]);

            if (!rolesResponse.ok || !permissionsResponse.ok) {
                 const errorRes = !rolesResponse.ok ? rolesResponse : permissionsResponse;
                 const errorData = await errorRes.json().catch(() => ({}));
                 throw new Error(errorData.message || 'Error al obtener los datos del servidor.');
            }

            setRoles(await rolesResponse.json());
            setAllPermissions(await permissionsResponse.json());
        } catch (err: any) {
            setError(err.message || 'No se pudo conectar con el servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if(user) {
            fetchData();
        }
    }, [user, getToken]);

    const handleOpenModal = (role: Role | null = null) => {
        setEditingRole(role);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRole(null);
    };

    const handleSaveRole = async (role: Role) => {
        const token = getToken();
        if (!token) {
            addNotification("Error de Sesión", "Su sesión ha expirado.", 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/roles`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(role),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Error desconocido al guardar el rol.');
            }
            
            const verb = !role.RoleId || role.RoleId === 0 ? 'creado' : 'actualizado';
            addNotification("Operación Exitosa", `Rol "${result.role.NombreRol}" ${verb} con éxito.`, 'success');
            
            await fetchData();
            handleCloseModal();
        } catch (err: any) {
            addNotification("Error al Guardar", err.message, 'error');
            console.error("Error al guardar el rol:", err);
        }
    };

    if (isLoading) return <div className="text-center p-8">Cargando roles...</div>;
    if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <h1 className="text-3xl font-bold text-slate-800">Gestión de Roles</h1>
                    <Tooltip text="Define los grupos de permisos (roles) para controlar qué puede hacer cada usuario en el sistema.">
                        <span><InfoIcon /></span>
                    </Tooltip>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <PlusCircleIcon />
                    Crear Rol
                </Button>
            </header>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-3 text-left font-semibold text-slate-600 w-1/4">Nombre del Rol</th>
                                <th className="p-3 text-left font-semibold text-slate-600">Permisos Asignados</th>
                                <th className="p-3 text-center font-semibold text-slate-600 w-24">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map(role => (
                                <tr key={role.RoleId} className="border-t border-slate-200 hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-800">{role.NombreRol}</td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {role.Permisos?.map(permission => {
                                                const content = (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                        {getFullPermissionTranslation(permission.NombrePermiso)}
                                                    </span>
                                                );

                                                return permission.Descripcion ? (
                                                    <Tooltip key={permission.PermisoId} text={permission.Descripcion}>
                                                        {content}
                                                    </Tooltip>
                                                ) : (
                                                    <React.Fragment key={permission.PermisoId}>{content}</React.Fragment>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <Tooltip text="Editar Rol">
                                            <button onClick={() => handleOpenModal(role)} className="p-2 text-slate-500 hover:text-[--theme-500] rounded-full hover:bg-slate-100">
                                                <PencilIcon />
                                            </button>
                                        </Tooltip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <RoleModal 
                isOpen={isModalOpen}
                role={editingRole} 
                allPermissions={allPermissions} 
                onClose={handleCloseModal} 
                onSave={handleSaveRole} 
            />
        </div>
    );
};