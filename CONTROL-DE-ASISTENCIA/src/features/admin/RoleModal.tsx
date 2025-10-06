// src/features/admin/RoleModal.tsx
import React, { useState, useEffect } from 'react';
import { Role, Permission } from '../../types';
import { Modal, Button } from '../../components/ui/Modal';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { 
    setupPermissions, 
    permissionIcons, 
    actionIcons, 
    getActionTranslation 
} from '../../utils/permissions';

const PermissionGroup = ({ groupKey, group, formData, handlePermissionChange, handleToggleAll, dependencies, allPermissions }: any) => {
    const [isOpen, setIsOpen] = useState(true);
    
    const groupPermissionIds = group.permissions.map((p: Permission) => p.PermisoId);
    const selectedInGroupCount = formData.Permisos?.filter((p: Permission) => groupPermissionIds.includes(p.PermisoId)).length || 0;
    const isAllSelected = group.permissions.length > 0 && selectedInGroupCount === group.permissions.length;

    const isPermissionDisabled = (permissionName: string) => {
        const dependency = dependencies[permissionName];
        if (!dependency) return false;
        const dependencyPermission = allPermissions.find((p: Permission) => p.NombrePermiso === dependency);
        return !formData.Permisos?.some((p: Permission) => p.PermisoId === dependencyPermission?.PermisoId);
    };

    return (
        <div className="border border-slate-200 rounded-lg">
            <div className="w-full flex justify-between items-center p-3 bg-slate-50 rounded-t-lg">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 flex-grow text-left">
                    {permissionIcons[groupKey] || <AlertTriangle size={20} />}
                    <span className="font-semibold text-slate-800">{group.label}</span>
                </button>
                <div className="flex items-center gap-3">
                    <label 
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={() => handleToggleAll(group.permissions, isAllSelected)}
                            className="h-4 w-4 rounded border-gray-300 text-[--theme-500] focus:ring-[--theme-500]"
                        />
                        <span>Todo</span>
                    </label>
                    <button type="button" onClick={() => setIsOpen(!isOpen)}>
                        <ChevronDown size={20} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>
            {isOpen && (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {group.permissions.map((permission: Permission) => {
                        const action = permission.NombrePermiso.split('.')[1];
                        const isDisabled = isPermissionDisabled(permission.NombrePermiso);
                        const permissionName = getActionTranslation(permission.NombrePermiso);

                        return (
                            <label key={permission.PermisoId} className={`flex items-center gap-2 p-2 rounded-md ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`}>
                                <input
                                    type="checkbox"
                                    checked={!isDisabled && formData.Permisos?.some((p: Permission) => p.PermisoId === permission.PermisoId) || false}
                                    disabled={isDisabled}
                                    onChange={() => handlePermissionChange(permission)}
                                    className="h-4 w-4 rounded border-gray-300 text-[--theme-500] focus:ring-[--theme-500]"
                                />
                                {actionIcons[action]}
                                <span className="text-sm text-slate-700">{permissionName}</span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const RoleModal = ({ role, allPermissions, onClose, onSave, isOpen }: { role: Role | null; allPermissions: Permission[]; onClose: () => void; onSave: (role: Role) => void; isOpen: boolean; }) => {
    const [formData, setFormData] = useState<Partial<Role>>({ NombreRol: '', Descripcion: '', Permisos: [] });
    const { groups, dependencies } = setupPermissions(allPermissions);

    useEffect(() => {
        if (isOpen) {
            if (role) {
                setFormData({ ...role, Permisos: role.Permisos || [] });
            } else {
                setFormData({ NombreRol: '', Descripcion: '', Permisos: [] });
            }
        }
    }, [role, isOpen]);

    const handlePermissionChange = (permission: Permission) => {
        let currentPermissions = formData.Permisos || [];
        const isCurrentlyChecked = currentPermissions.some(p => p.PermisoId === permission.PermisoId);
        let newPermissions: Permission[];

        if (isCurrentlyChecked) {
            newPermissions = currentPermissions.filter(p => p.PermisoId !== permission.PermisoId);
            Object.entries(dependencies).forEach(([child, parent]) => {
                if (parent === permission.NombrePermiso) {
                    const childPermission = allPermissions.find(p => p.NombrePermiso === child);
                    if (childPermission) {
                        newPermissions = newPermissions.filter(p => p.PermisoId !== childPermission.PermisoId);
                    }
                }
            });
        } else {
            newPermissions = [...currentPermissions, permission];
            const dependencyName = dependencies[permission.NombrePermiso];
            if (dependencyName) {
                const dependencyPermission = allPermissions.find(p => p.NombrePermiso === dependencyName);
                if (dependencyPermission && !newPermissions.some(p => p.PermisoId === dependencyPermission.PermisoId)) {
                    newPermissions.push(dependencyPermission);
                }
            }
        }
        setFormData(prev => ({ ...prev, Permisos: newPermissions }));
    };

    const handleToggleAll = (groupPermissions: Permission[], isCurrentlyAllSelected: boolean) => {
        let newPermissions = [...(formData.Permisos || [])];

        if (isCurrentlyAllSelected) {
            newPermissions = newPermissions.filter(p => !groupPermissions.some(gp => gp.PermisoId === p.PermisoId));
        } else {
            groupPermissions.forEach(gp => {
                if (!newPermissions.some(p => p.PermisoId === gp.PermisoId)) {
                    newPermissions.push(gp);
                }
                const dependencyName = dependencies[gp.NombrePermiso];
                if (dependencyName) {
                    const dependencyPermission = allPermissions.find(p => p.NombrePermiso === dependencyName);
                    if (dependencyPermission && !newPermissions.some(p => p.PermisoId === dependencyPermission.PermisoId)) {
                        newPermissions.push(dependencyPermission);
                    }
                }
            });
        }
        setFormData(prev => ({...prev, Permisos: newPermissions}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Role);
    };

    const selectedPermissionNames = (formData.Permisos || [])
        .map(p => getActionTranslation(p.NombrePermiso))
        .join(', ');

    const footer = (
        <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit}>Guardar Cambios</Button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={role ? `Editando Rol: ${role.NombreRol}` : 'Crear Nuevo Rol'} footer={footer} size="3xl">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/3 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Nombre del Rol</label>
                        <input type="text" value={formData.NombreRol} onChange={e => setFormData(prev => ({ ...prev, NombreRol: e.target.value }))} className="mt-1 w-full p-2 border border-slate-300 rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Descripción</label>
                        <textarea value={formData.Descripcion} onChange={e => setFormData(prev => ({ ...prev, Descripcion: e.target.value }))} className="mt-1 w-full p-2 border border-slate-300 rounded-md" rows={5}></textarea>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <h4 className="font-semibold text-slate-700">Permisos Asignados ({formData.Permisos?.length || 0})</h4>
                        <p className="text-sm text-slate-500 mt-1 max-h-64 overflow-y-auto">{selectedPermissionNames || 'Ninguno'}</p>
                    </div>
                </div>
                <div className="w-full md:w-2/3 space-y-4">
                    {Object.entries(groups).map(([groupKey, group]) => (
                        <PermissionGroup 
                            key={groupKey}
                            groupKey={groupKey}
                            group={group}
                            formData={formData}
                            handlePermissionChange={handlePermissionChange}
                            handleToggleAll={handleToggleAll}
                            dependencies={dependencies}
                            allPermissions={allPermissions}
                        />
                    ))}
                </div>
            </form>
        </Modal>
    );
};

