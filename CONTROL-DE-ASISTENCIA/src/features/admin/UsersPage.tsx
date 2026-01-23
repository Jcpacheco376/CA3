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
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

export const UsersPage = () => {
    const { getToken, user, can } = useAuth();
    const { addNotification } = useNotification();
    const [users, setUsers] = useState<User[]>([]);
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'NombreCompleto',
        direction: 'asc'
    });

    const canCreate = can('usuarios.create');
    const canManage = can('usuarios.update');
    const canRead = can('usuarios.read');

    // --- MODIFICACIÓN: Límite de píldoras a mostrar ---
    const CATALOG_DISPLAY_LIMIT = 5;

    const showDepartamentos = user?.activeFilters?.departamentos ?? true;
    const showGruposNomina = user?.activeFilters?.gruposNomina ?? true;
    const showPuestos = user?.activeFilters?.puestos ?? true;
    const showEstablecimientos = user?.activeFilters?.establecimientos ?? true;

    const SCROLL_THRESHOLD = 100;

    const fetchData = async () => {
        // ... (fetchData sin cambios)
        const token = getToken();
        if (!token) {
            setError("Sesión no válida.");
            setIsLoading(false);
            return;
        }
        const headers = { 'Authorization': `Bearer ${token}` };

        setIsLoading(true);
        try {
            if (!canRead) {
                throw new Error("No tienes permiso para ver este módulo.");
            }

            const usersPromise = fetch(`${API_BASE_URL}/users`, { headers });

            const rolesPromise = (can('roles.assign') || can('roles.manage'))
                ? fetch(`${API_BASE_URL}/roles`, { headers })
                : Promise.resolve(null);


            const [usersResponse, rolesResponse] = await Promise.all([
                usersPromise,
                rolesPromise
            ]);

            if (!usersResponse.ok) {
                const errorData = await usersResponse.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al obtener los datos del servidor.');
            }

            // const [usersResponse, rolesResponse] = await Promise.all([
            //     fetch(`${API_BASE_URL}/users`, { headers }),
            //     fetch(`${API_BASE_URL}/roles`, { headers })
            // ]);

            // if (!usersResponse.ok || !rolesResponse.ok) {
            //     const errorRes = !usersResponse.ok ? usersResponse : rolesResponse;
            //     const errorData = await errorRes.json().catch(() => ({}));
            //     throw new Error(errorData.message || 'Error al obtener los datos del servidor.');
            // }

            setUsers(await usersResponse.json());

            if (rolesResponse) {
                if (!rolesResponse.ok) {
                    // Si falló (ej. permiso de roles pero no de usuarios), lo notificamos pero no rompemos la página
                    addNotification("Aviso", "No se pudieron cargar los roles (requiere permiso 'roles.assign').", "info");
                } else {
                    setAllRoles(await rolesResponse.json());
                }
            } else {
                setAllRoles([]); // Si no tiene permiso, la lista de roles queda vacía
            }

            //setAllRoles(await rolesResponse.json());
        } catch (err: any) {
            setError(err.message || 'No se pudo conectar con el servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, getToken, can]);

    const handleOpenModal = (user: User | null = null) => {
        // ... (sin cambios)
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        // ... (sin cambios)
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (userToSave: User, password?: string) => {
        // ... (handleSaveUser sin cambios)
        const token = getToken();
        if (!token) {
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
                throw new Error(result.message || 'Error desconocido al guardar el usuario.');
            }

            const verb = !userToSave.UsuarioId || userToSave.UsuarioId === 0 ? 'creado' : 'actualizado';
            addNotification("Operación Exitosa", `Usuario "${result.user.NombreCompleto}" (ID: ${result.user.UsuarioId}) ${verb} con éxito.`, 'success');

            await fetchData();
            handleCloseModal();

        } catch (err: any) {
            addNotification("Error al Guardar", err.message, 'error');
            console.error("Error al guardar usuario:", err);
        }
    };

    const filteredUsers = React.useMemo(() => {
        let result = [...users];
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(u => 
                u.NombreCompleto.toLowerCase().includes(lower) || 
                u.NombreUsuario.toLowerCase().includes(lower) ||
                u.Email.toLowerCase().includes(lower)
            );
        }
        return result.sort((a, b) => {
            const aValue = (a as any)[sortConfig.key];
            const bValue = (b as any)[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [users, searchTerm, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />;
    };

    const useFixedLayout = filteredUsers.length > SCROLL_THRESHOLD;

    if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">{error}</div>;
    if (isLoading) return <div className="text-center p-8 flex justify-center items-center h-full"><Loader2 className="animate-spin mr-2"/>Cargando usuarios...</div>;

    return (
        <div className={`space-y-4 ${useFixedLayout ? 'h-full flex flex-col overflow-hidden' : ''}`}>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Usuarios</h2>
                <p className="text-slate-500 text-sm">Gestiona el acceso y roles de los usuarios del sistema.</p>
            </div>

            <div className="flex justify-between items-center">
                <div className="relative group w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-[--theme-500] transition-colors" size={16} />
                    <input
                        type="text"
                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 
                                focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent 
                                transition-all shadow-sm"
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>
                {canCreate && (
                    <Button onClick={() => handleOpenModal()}>
                        <PlusCircleIcon />
                        Crear Usuario
                    </Button>
                )}
            </div>

            <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${useFixedLayout ? 'flex-1 flex flex-col min-h-0' : ''}`}>
                <div className={useFixedLayout ? 'overflow-auto flex-1' : 'overflow-x-auto'}>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                {/* ... (thead sin cambios) ... */}
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors w-24" onClick={() => handleSort('UsuarioId')}>
                                    <div className="flex items-center gap-2">ID {getSortIcon('UsuarioId')}</div>
                                </th>
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors whitespace-nowrap min-w-[180px]" onClick={() => handleSort('NombreCompleto')}>
                                    <div className="flex items-center gap-2">Nombre Completo {getSortIcon('NombreCompleto')}</div>
                                </th>
                                <th className="p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => handleSort('NombreUsuario')}>
                                    <div className="flex items-center gap-2">Usuario {getSortIcon('NombreUsuario')}</div>
                                </th>
                                <th className="p-3 text-left font-semibold text-slate-600">Roles</th>
                                {showDepartamentos && <th className="p-3 text-left font-semibold text-slate-600">Departamentos</th>}
                                {showGruposNomina && <th className="p-3 text-left font-semibold text-slate-600">Grupos de Nómina</th>}
                                {showPuestos && <th className="p-3 text-left font-semibold text-slate-600">Puestos</th>}
                                {showEstablecimientos && <th className="p-3 text-left font-semibold text-slate-600">Establecimientos</th>}
                                <th className="p-3 text-center font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors w-32" onClick={() => handleSort('EstaActivo')}>
                                    <div className="flex items-center justify-center gap-2">Estado {getSortIcon('EstaActivo')}</div>
                                </th>
                                {canManage && <th className="p-3 text-center font-semibold text-slate-600">Acciones</th>}
                                {!canManage && <th className="p-3 text-center font-semibold text-slate-600"></th>}

                            </tr>
                        </thead>
                        {/* --- MODIFICACIÓN: tbody con lógica de truncado --- */}
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u.UsuarioId} className="border-t border-slate-200 hover:bg-slate-50">
                                    <td className="p-3 font-mono text-slate-500">{u.UsuarioId}</td>
                                    <td className="p-3 font-medium text-slate-800">{u.NombreCompleto}</td>
                                    <td className="p-3 text-slate-600">{u.NombreUsuario}</td>
                                    <td className="p-3">
                                        <Tooltip
                                            text={u.Roles?.map((r, i) => i === 0 ? `${r.NombreRol} (Principal)` : r.NombreRol).join(', ') || 'N/A'}
                                            placement="top"
                                            disabled={!u.Roles || u.Roles.length <= CATALOG_DISPLAY_LIMIT}
                                        >
                                            <div className="flex flex-wrap gap-1 items-center">
                                                {u.Roles?.slice(0, CATALOG_DISPLAY_LIMIT).map((role, index) => {
                                                    // LÓGICA IMPLÍCITA: Índice 0 es el Principal
                                                    const isPrincipal = index === 0;

                                                    return (
                                                        <span
                                                            key={role.RoleId}
                                                            className={`
                            text-xs px-2 py-1 rounded-full border transition-colors
                            ${isPrincipal
                                                                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200 font-medium' // Estilo Principal (Armonizado)
                                                                    : 'bg-slate-100 text-slate-600 border-slate-200' // Estilo Secundario
                                                                }
                        `}
                                                        >
                                                            {role.NombreRol}
                                                        </span>
                                                    );
                                                })}

                                                {u.Roles && u.Roles.length > CATALOG_DISPLAY_LIMIT && (
                                                    <span className="text-xs bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200">
                                                        +{u.Roles.length - CATALOG_DISPLAY_LIMIT}
                                                    </span>
                                                )}
                                            </div>
                                        </Tooltip>
                                    </td>
                                    {showDepartamentos && (
                                    <td className="p-3">
                                        <Tooltip
                                            text={u.Departamentos?.map(d => d.Nombre).join(', ') || 'N/A'}
                                            placement="top"
                                            disabled={!u.Departamentos || u.Departamentos.length <= CATALOG_DISPLAY_LIMIT}
                                        >
                                            <div className="flex flex-wrap gap-1 items-center">
                                                {u.Departamentos?.slice(0, CATALOG_DISPLAY_LIMIT).map(depto => (
                                                    <span key={depto.DepartamentoId} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">{depto.Nombre}</span>
                                                ))}
                                                {u.Departamentos && u.Departamentos.length > CATALOG_DISPLAY_LIMIT && (
                                                    <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full">
                                                        +{u.Departamentos.length - CATALOG_DISPLAY_LIMIT}
                                                    </span>
                                                )}
                                            </div>
                                        </Tooltip>
                                    </td>
                                    )}
                                    {showGruposNomina && (
                                    <td className="p-3">
                                        <Tooltip
                                            text={u.GruposNomina?.map(g => g.Nombre).join(', ') || 'N/A'}
                                            placement="top"
                                            disabled={!u.GruposNomina || u.GruposNomina.length <= CATALOG_DISPLAY_LIMIT}
                                        >
                                            <div className="flex flex-wrap gap-1 items-center">
                                                {u.GruposNomina?.slice(0, CATALOG_DISPLAY_LIMIT).map(grupo => (
                                                    <span key={grupo.GrupoNominaId} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">{grupo.Nombre}</span>
                                                ))}
                                                {u.GruposNomina && u.GruposNomina.length > CATALOG_DISPLAY_LIMIT && (
                                                    <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full">
                                                        +{u.GruposNomina.length - CATALOG_DISPLAY_LIMIT}
                                                    </span>
                                                )}
                                            </div>
                                        </Tooltip>
                                    </td>
                                    )}
                                    {showPuestos && (
                                    <td className="p-3">
                                        <Tooltip
                                            text={u.Puestos?.map(p => p.Nombre).join(', ') || 'N/A'}
                                            placement="top"
                                            disabled={!u.Puestos || u.Puestos.length <= CATALOG_DISPLAY_LIMIT}
                                        >
                                            <div className="flex flex-wrap gap-1 items-center">
                                                {u.Puestos?.slice(0, CATALOG_DISPLAY_LIMIT).map(puesto => (
                                                    <span key={puesto.PuestoId} className="text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full">{puesto.Nombre}</span>
                                                ))}
                                                {u.Puestos && u.Puestos.length > CATALOG_DISPLAY_LIMIT && (
                                                    <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full">
                                                        +{u.Puestos.length - CATALOG_DISPLAY_LIMIT}
                                                    </span>
                                                )}
                                            </div>
                                        </Tooltip>
                                    </td>
                                    )}
                                    {showEstablecimientos && (
                                    <td className="p-3">
                                        <Tooltip
                                            text={u.Establecimientos?.map(e => e.Nombre).join(', ') || 'N/A'}
                                            placement="top"
                                            disabled={!u.Establecimientos || u.Establecimientos.length <= CATALOG_DISPLAY_LIMIT}
                                        >
                                            <div className="flex flex-wrap gap-1 items-center">
                                                {u.Establecimientos?.slice(0, CATALOG_DISPLAY_LIMIT).map(estab => (
                                                    <span key={estab.EstablecimientoId} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">{estab.Nombre}</span>
                                                ))}
                                                {u.Establecimientos && u.Establecimientos.length > CATALOG_DISPLAY_LIMIT && (
                                                    <span className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full">
                                                        +{u.Establecimientos.length - CATALOG_DISPLAY_LIMIT}
                                                    </span>
                                                )}
                                            </div>
                                        </Tooltip>
                                    </td>
                                    )}
                                    <td className="p-3 text-center">
                                        {/* ... (celda de estado sin cambios) ... */}
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.EstaActivo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {u.EstaActivo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        {/* --- MODIFICACIÓN: Botón condicional --- */}
                                        {canManage && (
                                            <button onClick={() => handleOpenModal(u)} className="p-2 text-slate-500 hover:text-[--theme-500] rounded-full hover:bg-slate-100">
                                                <PencilIcon />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <UserModal
                    isOpen={isModalOpen}
                    user={editingUser}
                    allRoles={allRoles}
                    onClose={handleCloseModal}
                    onSave={handleSaveUser}
                />
            )}
        </div>
    );
};