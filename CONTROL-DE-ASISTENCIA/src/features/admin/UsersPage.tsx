// src/features/admin/UsersPage.tsx
import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types/index.ts';
import { UserModal } from './UserModal.tsx';
import { PlusCircleIcon, PencilIcon } from '../../components/ui/Icons.tsx';
import { Button } from '../../components/ui/Modal.tsx';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { API_BASE_URL } from '../../config/api.ts';

export const UsersPage = () => {
    const { getToken, user } = useAuth(); 
    const { addNotification } = useNotification();
    const [users, setUsers] = useState<User[]>([]);
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

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
            const [usersResponse, rolesResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/users`, { headers }),
                fetch(`${API_BASE_URL}/roles`, { headers })
            ]);

            if (!usersResponse.ok || !rolesResponse.ok) {
                const errorRes = !usersResponse.ok ? usersResponse : rolesResponse;
                const errorData = await errorRes.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al obtener los datos del servidor.');
            }

            setUsers(await usersResponse.json());
            setAllRoles(await rolesResponse.json());
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

    const handleOpenModal = (user: User | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (userToSave: User, password?: string) => {
        const token = getToken();
        if(!token) {
            addNotification("Error de Sesión", "Su sesión ha expirado. No se pueden guardar los cambios.", 'error');
            handleCloseModal();
            return;
        }

        const payload = { ...userToSave, Password: password };

        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok) {
                // Si la respuesta no es OK, lanzamos un error con el mensaje de la API.
                throw new Error(result.message || 'Error desconocido al guardar el usuario.');
            }
            
            const verb = !userToSave.UsuarioId || userToSave.UsuarioId === 0 ? 'creado' : 'actualizado';
            addNotification("Operación Exitosa", `Usuario "${result.user.NombreCompleto}" (ID: ${result.user.UsuarioId}) ${verb} con éxito.`, 'success');
            
            await fetchData();
            // --- CORRECCIÓN: El modal solo se cierra si la operación es exitosa ---
            handleCloseModal();

        } catch (err: any) {
            // Si ocurre un error, se muestra la notificación pero el modal permanece abierto.
            addNotification("Error al Guardar", err.message, 'error');
            console.error("Error al guardar usuario:", err);
        }
    };
    
    if (isLoading) return <div className="text-center p-8">Cargando usuarios...</div>;
    if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                 <div className="flex items-center space-x-3">
                    <h1 className="text-3xl font-bold text-slate-800">Gestión de Usuarios</h1>
                     <Tooltip text="Crea, edita y gestiona los usuarios del sistema, sus roles y accesos.">
                        <span><InfoIcon /></span>
                    </Tooltip>
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <PlusCircleIcon />
                    Crear Usuario
                </Button>
            </header>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-3 text-left font-semibold text-slate-600">ID Usuario</th>
                                <th className="p-3 text-left font-semibold text-slate-600">Nombre Completo</th>
                                <th className="p-3 text-left font-semibold text-slate-600">Usuario</th>
                                <th className="p-3 text-left font-semibold text-slate-600">Roles</th>
                                <th className="p-3 text-left font-semibold text-slate-600">Departamentos</th>
                                <th className="p-3 text-left font-semibold text-slate-600">Grupos de Nómina</th>
                                <th className="p-3 text-center font-semibold text-slate-600">Estado</th>
                                <th className="p-3 text-center font-semibold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.UsuarioId} className="border-t border-slate-200 hover:bg-slate-50">
                                    <td className="p-3 font-mono text-slate-500">{u.UsuarioId}</td>
                                    <td className="p-3 font-medium text-slate-800">{u.NombreCompleto}</td>
                                    <td className="p-3 text-slate-600">{u.NombreUsuario}</td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                            {u.Roles?.map(role => (
                                                <span key={role.RoleId} className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full">{role.NombreRol}</span>
                                            ))}
                                        </div>
                                    </td>
                                     <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                            {u.Departamentos?.map(depto => (
                                                <span key={depto.DepartamentoId} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">{depto.Nombre}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                            {u.GruposNomina?.map(grupo => (
                                                <span key={grupo.GrupoNominaId} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">{grupo.Nombre}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.EstaActivo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {u.EstaActivo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => handleOpenModal(u)} className="p-2 text-slate-500 hover:text-[--theme-500] rounded-full hover:bg-slate-100">
                                            <PencilIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <UserModal 
                isOpen={isModalOpen}
                user={editingUser} 
                allRoles={allRoles} 
                onClose={handleCloseModal} 
                onSave={handleSaveUser} 
            />
        </div>
    );
};

