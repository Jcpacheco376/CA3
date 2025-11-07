// src/features/admin/RoleModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Role, Permission } from '../../types';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
// --- MODIFICACIÓN: Importaciones completas (Añadido 'Check' y 'ChevronDown') ---
import { 
    ChevronDown, AlertTriangle, Check, CheckCheck, XCircle,
    Users, Settings, FileText, CalendarClock, Folder, Building, 
    Briefcase, Clock, Tag, MapPin 
} from 'lucide-react';
import { 
    setupPermissions, 
    actionIcons, 
    getActionTranslation 
} from '../../utils/permissions.tsx'; // 'permissions.tsx'

// --- Checkbox Local (de UserModal) ---
const Checkbox = ({ id, label, checked, onChange }: {
    id: string | number,
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
}) => {
    return (
        <label 
            htmlFor={`cb-local-${id}`} 
            className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer"
        >
            <div className="relative w-5 h-5 shrink-0">
                <input 
                    id={`cb-local-${id}`}
                    type="checkbox" 
                    checked={checked} 
                    onChange={(e) => onChange(e.target.checked)}
                    className="
                        peer appearance-none w-5 h-5 rounded-md
                        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[--theme-500]
                    "
                />
                <div className="
                    absolute inset-0 w-full h-full 
                    rounded-md border-2 border-slate-300
                    peer-checked:bg-[--theme-500] peer-checked:border-[--theme-500]
                    transition-colors
                    pointer-events-none
                "></div>
                <Check 
                    size={14} 
                    className={`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                        text-white pointer-events-none 
                        transition-opacity opacity-0 
                        peer-checked:opacity-100
                    `} 
                />
            </div>
            <span className="text-sm text-slate-700 select-none truncate flex items-center gap-2" title={label}>
                {label}
            </span>
        </label>
    );
};

// --- Sección Colapsable (con Tooltip) ---
const CollapsibleSection = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-200 rounded-lg">
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4"
            >
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <Tooltip text={isOpen ? "Contraer" : "Expandir"}>
                    <ChevronDown size={20} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </Tooltip>
            </button>
            {isOpen && (
                <div className="p-4 pt-0">
                    {children}
                </div>
            )}
        </div>
    );
};

// --- PermissionGroup (con Tooltip en Checkbox) ---
const PermissionGroup = ({ 
    groupKey, group, formData, handlePermissionChange, 
    dependencies, allPermissions 
}: {
    groupKey: string,
    group: { label: string; permissions: Permission[] },
    formData: Partial<Role>,
    handlePermissionChange: (permission: Permission, forceCheck?: boolean, isBatchOp?: boolean) => void,
    dependencies: { [key: string]: string },
    allPermissions: Permission[]
}) => {
    
    const groupPermissionIds = group.permissions.map((p: Permission) => p.PermisoId);
    const selectedInGroup = formData.Permisos?.filter((p: Permission) => groupPermissionIds.includes(p.PermisoId)) || [];
    const allSelected = group.permissions.length > 0 && selectedInGroup.length === group.permissions.length;

    const handleToggleAll = () => {
        if (allSelected) {
            selectedInGroup.forEach(p => {
                handlePermissionChange(p, false, true); // Desmarcar (isBatchOp=true)
            });
        } else {
            group.permissions.forEach(p => {
                handlePermissionChange(p, true, true); // Marcar (isBatchOp=true)
            });
        }
    };
    
    const groupIcons: { [key: string]: React.ReactNode } = {
        'usuarios': <Users size={18} />,
        'roles': <Settings size={18} />,
        'reportesAsistencia': <FileText size={18} />,
        'horarios': <CalendarClock size={18} />,
        'catalogo.departamentos': <Building size={18} />,
        'catalogo.gruposNomina': <Briefcase size={18} />,
        'catalogo.estatusAsistencia': <Check size={18} />,
        'catalogo.horarios': <Clock size={18} />,
        'catalogo.puestos': <Tag size={18} />,
        'catalogo.establecimientos': <MapPin size={18} />,
        'default': <Folder size={18} />
    };

    const isPermissionDisabled = (permissionName: string) => {
        const dependency = dependencies[permissionName];
        if (!dependency) return false;
        const dependencyPermission = allPermissions.find((p: Permission) => p.NombrePermiso === dependency);
        return !formData.Permisos?.some((p: Permission) => p.PermisoId === dependencyPermission?.PermisoId);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-2 px-1">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    {groupIcons[groupKey] || groupIcons['default']}
                    {group.label}
                </h4>
                <Tooltip text={allSelected ? "Limpiar todos" : "Marcar todos"}>
                    <button 
                        type="button" 
                        onClick={handleToggleAll} 
                        className={`p-1 ${allSelected ? 'text-red-500 hover:text-red-700' : 'text-slate-400 hover:text-blue-500'}`}
                    >
                        {allSelected ? <XCircle size={16} /> : <CheckCheck size={16} />}
                    </button>
                </Tooltip>
            </div>

            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 flex-1 min-h-[150px]">
                <div className="max-h-48 h-full overflow-y-auto space-y-1">
                    {group.permissions.map((permission: Permission) => {
                        const isDisabled = isPermissionDisabled(permission.NombrePermiso);
                        const permissionName = getActionTranslation(permission.NombrePermiso);
                        const isChecked = !isDisabled && (formData.Permisos?.some((p: Permission) => p.PermisoId === permission.PermisoId) || false);
                        
                        return (
                            <div key={permission.PermisoId} className={`${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <Tooltip text={permission.Descripcion || permissionName} placement="right">
                                    <Checkbox
                                        id={permission.PermisoId}
                                        label={
                                            <div className="flex items-center gap-2">
                                                {actionIcons[permission.NombrePermiso.split('.')[1] || 'default']}
                                                <span>{permissionName}</span>
                                            </div>
                                        }
                                        checked={isChecked}
                                        onChange={() => {
                                            if (!isDisabled) {
                                                handlePermissionChange(permission); // <-- Llama a la función con el clic simple
                                            }
                                        }}
                                    />
                                </Tooltip>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
// --- FIN PermissionGroup ---

export const RoleModal = ({ role, allPermissions, onClose, onSave, isOpen }: { role: Role | null; allPermissions: Permission[]; onClose: () => void; onSave: (role: Role) => void; isOpen: boolean; }) => {
    const [formData, setFormData] = useState<Partial<Role>>({ NombreRol: '', Descripcion: '', Permisos: [] });
    
    const { groups, dependencies } = useMemo(() => setupPermissions(allPermissions), [allPermissions]);
    
    const sortedGroupKeys = useMemo(() => {
        const order = ['usuarios', 'roles', 'reportesAsistencia', 'horarios'];
        const catalogKeys = Object.keys(groups).filter(k => k.startsWith('catalogo.')).sort();
        const otherKeys = Object.keys(groups).filter(k => !order.includes(k) && !k.startsWith('catalogo.'));
        
        return [...order.filter(k => groups[k]), ...catalogKeys, ...otherKeys];
    }, [groups]);


    useEffect(() => {
        if (isOpen) {
            if (role) {
                setFormData({ ...role, Permisos: role.Permisos || [] });
            } else {
                setFormData({ NombreRol: '', Descripcion: '', Permisos: [] });
            }
        }
    }, [role, isOpen]);

    // --- MODIFICACIÓN: Lógica de 'handlePermissionChange' CORREGIDA ---
    const handlePermissionChange = (permission: Permission, forceCheck: boolean = false, isBatchOp: boolean = false) => {
        setFormData(prev => {
            let currentPermissions = prev.Permisos || [];
            const isCurrentlyChecked = currentPermissions.some(p => p.PermisoId === permission.PermisoId);
            let newPermissions: Permission[];

            if (isCurrentlyChecked && !forceCheck) {
                // --- LÓGICA DE DESMARCAR ---
                newPermissions = currentPermissions.filter(p => p.PermisoId !== permission.PermisoId);
                
                // Si NO es una operación por lotes (batch), desmarcar dependientes
                if (!isBatchOp) {
                    Object.entries(dependencies).forEach(([child, parent]) => {
                        if (parent === permission.NombrePermiso) {
                            const childPermission = allPermissions.find(p => p.NombrePermiso === child);
                            if (childPermission) {
                                newPermissions = newPermissions.filter(p => p.PermisoId !== childPermission.PermisoId);
                            }
                        }
                    });
                }
            } else if (!isCurrentlyChecked && (forceCheck || !isBatchOp)) { // <-- ¡BUG CORREGIDO AQUI!
                // --- LÓGICA DE MARCAR ---
                // Marcar si (es forzado) O (no es batch op - o sea, es clic simple)
                newPermissions = [...currentPermissions, permission];
                
                // Marcar dependencias (siempre)
                const dependencyName = dependencies[permission.NombrePermiso];
                if (dependencyName) {
                    const dependencyPermission = allPermissions.find(p => p.NombrePermiso === dependencyName);
                    if (dependencyPermission && !newPermissions.some(p => p.PermisoId === dependencyPermission.PermisoId)) {
                        newPermissions.push(dependencyPermission);
                    }
                }
            } else {
                // El estado ya es el deseado (o es desmarcar en batch, lo cual se maneja arriba)
                return prev;
            }

            // Usamos un Set para asegurar que no haya duplicados
            const uniquePerms = Array.from(new Set(newPermissions.map(p => p.PermisoId)))
                                    .map(id => allPermissions.find(p => p.PermisoId === id)!);
                                    
            return { ...prev, Permisos: uniquePerms };
        });
    };
    // --- FIN MODIFICACIÓN ---

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as Role);
    };

    const footer = (
        <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit}>Guardar Cambios</Button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={role ? `Editando Rol: ${role.NombreRol}` : 'Crear Nuevo Rol'} footer={footer} size="3xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                <CollapsibleSection title="Información del Rol">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="roleName" className="block text-sm font-medium text-slate-700">Nombre del Rol</label>
                            <Tooltip text="El nombre único para identificar este rol.">
                                <input 
                                    id="roleName"
                                    type="text" 
                                    value={formData.NombreRol} 
                                    onChange={e => setFormData(prev => ({ ...prev, NombreRol: e.target.value }))} 
                                    className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" 
                                    required 
                                />
                            </Tooltip>
                        </div>
                        <div>
                            <label htmlFor="roleDesc" className="block text-sm font-medium text-slate-700">Descripción (Opcional)</label>
                            <Tooltip text="Una breve descripción de lo que hace este rol.">
                                <input 
                                    id="roleDesc"
                                    type="text" 
                                    value={formData.Descripcion} 
                                    onChange={e => setFormData(prev => ({ ...prev, Descripcion: e.target.value }))} 
                                    className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" 
                                />
                            </Tooltip>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Permisos del Rol">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sortedGroupKeys.map(groupKey => {
                            const group = groups[groupKey];
                            if (!group) return null; // Seguridad
                            
                            return (
                                <PermissionGroup 
                                    key={groupKey}
                                    groupKey={groupKey}
                                    group={group}
                                    formData={formData}
                                    handlePermissionChange={handlePermissionChange}
                                    dependencies={dependencies}
                                    allPermissions={allPermissions}
                                />
                            );
                        })}
                    </div>
                </CollapsibleSection>

            </form>
        </Modal>
    );
};