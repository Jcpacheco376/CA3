// src/features/admin/RolesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Role, Permission } from '../../types';
import { PlusCircleIcon, PencilIcon } from '../../components/ui/Icons';
import { RoleModal } from './RoleModal';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip';
import { Button } from '../../components/ui/Modal';
import { getFullPermissionTranslation } from '../../utils/permissions';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { API_BASE_URL } from '../../config/api';
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

export const RolesPage = () => {
    const { getToken, user } = useAuth();
    const { addNotification } = useNotification();
    const [roles, setRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'NombreRol',
        direction: 'asc'
    });

    const SCROLL_THRESHOLD = 100;

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
                fetch(`${API_BASE_URL}/roles`, { headers }),
                fetch(`${API_BASE_URL}/roles/permissions`, { headers })
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
            const response = await fetch(`${API_BASE_URL}/roles`, {
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

    const filteredRoles = useMemo(() => {
        let result = [...roles];
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(r => 
                r.NombreRol.toLowerCase().includes(lower) || 
                (r.Descripcion && r.Descripcion.toLowerCase().includes(lower))
            );
        }
        return result.sort((a, b) => {
            const aValue = (a as any)[sortConfig.key];
            const bValue = (b as any)[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [roles, searchTerm, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />;
    };

    const useFixedLayout = filteredRoles.length > SCROLL_THRESHOLD;

    if (isLoading) return <div className="text-center p-8 flex justify-center items-center h-full"><Loader2 className="animate-spin mr-2"/>Cargando roles...</div>;
    if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>;

    return (
        <div className={`space-y-4 ${useFixedLayout ? 'h-full flex flex-col overflow-hidden' : ''}`}>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Roles</h2>
                <p className="text-slate-500 text-sm">Define los grupos de permisos para controlar el acceso al sistema.</p>
            </div>

            <div className="flex justify-between items-center">
                <div className="relative group w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-[--theme-500] transition-colors" size={16} />
                    <input
                        type="text"
                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 
                                focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent 
                                transition-all shadow-sm"
                        placeholder="Buscar rol..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <Button onClick={() => handleOpenModal()}>
                    <PlusCircleIcon />
                    Crear Rol
                </Button>
            </div>

            <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${useFixedLayout ? 'flex-1 flex flex-col min-h-0' : ''}`}>
                <div className={useFixedLayout ? 'overflow-auto flex-1' : 'overflow-x-auto'}>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors w-1/4" onClick={() => handleSort('NombreRol')}>
                                    <div className="flex items-center gap-2">Nombre del Rol {getSortIcon('NombreRol')}</div>
                                </th>
                                <th className="p-3 text-left font-semibold text-slate-600">Permisos Asignados</th>
                                <th className="p-3 text-center font-semibold text-slate-600 w-24">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRoles.map(role => (
                                <tr key={role.RoleId} className="border-t border-slate-200 hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-800 align-top">
                                        {role.NombreRol}
                                        {role.Descripcion && <p className="text-xs text-slate-500 font-normal mt-0.5">{role.Descripcion}</p>}
                                    </td>
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
                                            {(!role.Permisos || role.Permisos.length === 0) && <span className="text-slate-400 text-xs italic">Sin permisos asignados</span>}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center align-top">
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