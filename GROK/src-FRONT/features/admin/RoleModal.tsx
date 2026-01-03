import React, { useState, useEffect, useMemo } from 'react';
import { Role, Permission } from '../../types';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
// --- MODIFICACIÓN: Importaciones completas con nuevos iconos para las secciones ---
import { 
    ChevronDown, AlertTriangle, Check, CheckCheck, XCircle,
    Users, Settings, FileText, CalendarClock, Folder, Building, Eye,
    Briefcase, Clock, Tag, MapPin,
    LayoutDashboard, BarChart3, Shield, Database // Nuevos iconos
} from 'lucide-react';
import { 
    setupPermissions, 
    actionIcons, 
    getActionTranslation,
    permissionIcons 
} from '../../utils/permissions.tsx'; // 'permissions.tsx'

// --- Checkbox Local (de UserModal) ---
const Checkbox = ({ id, label, checked, onChange }: {
    id: string | number,
    label: string | React.ReactNode,
    checked: boolean,
    onChange: (checked: boolean) => void,
}) => {
    return (
        <label 
            htmlFor={`cb-local-${id}`} 
            className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
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
            <span className="text-sm text-slate-700 select-none truncate flex items-center gap-2 w-full" title={typeof label === 'string' ? label : ''}>
                {label}
            </span>
        </label>
    );
};

// --- NUEVO: Componente de Rejilla Visual (Para Dashboards y Reportes) ---
// Este componente usa un estilo de "Lista de Configuración" con Switches
const VisualPermissionGrid = ({ 
    group, formData, handlePermissionChange 
}: {
    group: { label: string; permissions: Permission[], icon?: React.ReactNode },
    formData: Partial<Role>,
    handlePermissionChange: (permission: Permission, forceCheck?: boolean, isBatchOp?: boolean) => void
}) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="mb-6 last:mb-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Encabezado del Grupo */}
            <div 
                className="bg-slate-50/80 p-3 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <div className="text-slate-500">
                        {group.icon}
                    </div>
                    <h4 className="font-semibold text-slate-700 text-sm">
                        {group.label}
                    </h4>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            
            {/* Lista de Permisos */}
            {isOpen && (
            <div className="divide-y divide-slate-100 animate-in slide-in-from-top-2 duration-200">
                {group.permissions.map((permission: Permission) => {
                    const isChecked = formData.Permisos?.some((p: Permission) => p.PermisoId === permission.PermisoId) || false;
                    const actionName = getActionTranslation(permission.NombrePermiso);
                    const actionKey = permission.NombrePermiso.substring(permission.NombrePermiso.indexOf('.') + 1);

                    return (
                        <div 
                            key={permission.PermisoId}
                            onClick={() => handlePermissionChange(permission)}
                            className={`
                                flex items-center gap-4 p-4 transition-colors cursor-pointer hover:bg-slate-50
                                ${isChecked ? 'bg-indigo-50/30' : ''}
                            `}
                        >
                            {/* Icono */}
                            <div className={`
                                w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                                ${isChecked 
                                    ? 'bg-indigo-100 text-indigo-600' 
                                    : 'bg-slate-100 text-slate-400'
                                }
                            `}>
                                {actionIcons[actionKey] || <Eye size={20} />}
                            </div>

                            {/* Texto */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${isChecked ? 'text-indigo-900' : 'text-slate-700'}`}>
                                        {actionName}
                                    </span>
                                    {isChecked && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full animate-in fade-in zoom-in duration-200">
                                            ACTIVO
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                    {permission.Descripcion}
                                </p>
                            </div>

                            {/* Switch Visual */}
                            <div className={`
                                w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0
                                ${isChecked ? 'bg-indigo-500' : 'bg-slate-200'}
                            `}>
                                <div className={`
                                    bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200
                                    ${isChecked ? 'translate-x-5' : 'translate-x-0'}
                                `} />
                            </div>
                        </div>
                    );
                })}
            </div>
            )}
        </div>
    );
};

// --- Componente para un Grupo de Permisos ---
const PermissionGroup = ({ 
    groupKey, group, formData, handlePermissionChange, 
    dependencies, allPermissions, onToggleGroup 
}: {
    groupKey: string,
    group: { label: string; permissions: Permission[], icon?: React.ReactNode },
    formData: Partial<Role>,
    handlePermissionChange: (permission: Permission, forceCheck?: boolean, isBatchOp?: boolean) => void,
    dependencies: { [key: string]: string },
    allPermissions: Permission[]
    onToggleGroup: (groupPermissions: Permission[], select: boolean) => void
}) => {
    const [isOpen, setIsOpen] = useState(true);
    
    const groupPermissionIds = group.permissions.map((p: Permission) => p.PermisoId);
    const selectedInGroup = formData.Permisos?.filter((p: Permission) => groupPermissionIds.includes(p.PermisoId)) || [];
    const allSelected = group.permissions.length > 0 && selectedInGroup.length === group.permissions.length;

    const handleToggleAll = () => {
        onToggleGroup(group.permissions, !allSelected);
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
                <button 
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="font-semibold text-slate-800 flex items-center gap-2 text-sm hover:text-[--theme-600] transition-colors focus:outline-none"
                >
                    {group.icon || permissionIcons['default']}
                    {group.label}
                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <Tooltip text={allSelected ? "Limpiar todo" : "Marcar todos"}>
                    <button 
                        type="button" 
                        onClick={handleToggleAll} 
                        className={`p-1 rounded-md transition-colors ${allSelected ? 'text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-[--theme-500] hover:bg-slate-100'}`}
                    >
                        {allSelected ? <XCircle size={16} /> : <CheckCheck size={16} />}
                    </button>
                </Tooltip>
            </div>

            {isOpen && (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 flex-1 min-h-[120px]">
                <div className="max-h-48 h-full overflow-y-auto space-y-1 custom-scrollbar">
                    {group.permissions.map((permission: Permission) => {
                        const isDisabled = isPermissionDisabled(permission.NombrePermiso);
                        const actionName = getActionTranslation(permission.NombrePermiso);
                        const actionKey = permission.NombrePermiso.substring(permission.NombrePermiso.lastIndexOf('.') + 1);
                        
                        const isChecked = !isDisabled && (formData.Permisos?.some((p: Permission) => p.PermisoId === permission.PermisoId) || false);
                        
                        return (
                            <div key={permission.PermisoId} className={`${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <Tooltip text={permission.Descripcion || actionName} placement="right" disabled={isDisabled}>
                                    <Checkbox
                                        id={permission.PermisoId}
                                        label={
                                            <div className="flex items-center gap-2">
                                                {actionIcons[actionKey] || actionIcons['default']}
                                                <span>{actionName}</span>
                                            </div>
                                        }
                                        checked={isChecked}
                                        onChange={() => {
                                            if (!isDisabled) {
                                                handlePermissionChange(permission);
                                            }
                                        }}
                                    />
                                </Tooltip>
                            </div>
                        );
                    })}
                </div>
            </div>
            )}
        </div>
    );
};

export const RoleModal = ({ role, allPermissions, onClose, onSave, isOpen }: { role: Role | null; allPermissions: Permission[]; onClose: () => void; onSave: (role: Role) => void; isOpen: boolean; }) => {
    const [formData, setFormData] = useState<Partial<Role>>({ NombreRol: '', Descripcion: '', Permisos: [] });
    const [activeTab, setActiveTab] = useState<'operational' | 'visual' | 'catalogs' | 'admin'>('operational');
    
    const { groups, dependencies } = useMemo(() => setupPermissions(allPermissions), [allPermissions]);
    
    // --- NUEVA LÓGICA: Categorización de Permisos ---
    const categories = useMemo(() => {
        const cats = {
            operational: [] as string[], // Asistencia, Horarios, Nómina
            visual: [] as string[],      // Dashboards y Reportes
            catalogs: [] as string[],    // Catálogos (NUEVO)
            admin: [] as string[],       // Usuarios, Roles
        };

        Object.keys(groups).forEach(key => {
            if (key === 'dashboard' || key === 'reportes') { // Ahora 'reportes' es un solo grupo
                cats.visual.push(key);
            } else if (key.startsWith('catalogo.')) {
                cats.catalogs.push(key);
            } else if (key === 'usuarios' || key === 'roles') {
                cats.admin.push(key);
            } else {
                // Por defecto a operación (reportesAsistencia, horarios, nomina, etc.)
                cats.operational.push(key);
            }
        });

        // Ordenamiento interno para Visual (Dashboard primero)
        cats.visual.sort((a, b) => {
            if (a === 'dashboard') return -1;
            if (b === 'dashboard') return 1;
            return a.localeCompare(b);
        });
        
        // Orden específico para Operación
        const opOrder = ['reportesAsistencia', 'horarios', 'nomina'];
        cats.operational.sort((a, b) => {
            const idxA = opOrder.indexOf(a);
            const idxB = opOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        // Orden para Admin (Usuarios, Roles)
        const adminOrder = ['usuarios', 'roles'];
        cats.admin.sort((a, b) => {
            const idxA = adminOrder.indexOf(a);
            const idxB = adminOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        // Orden para Catálogos (Alfabético)
        cats.catalogs.sort((a, b) => a.localeCompare(b));

        return cats;
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

    const handlePermissionChange = (permission: Permission, forceCheck: boolean = false, isBatchOp: boolean = false) => {
        setFormData(prev => {
            let currentPermissions = prev.Permisos || [];
            const isCurrentlyChecked = currentPermissions.some(p => p.PermisoId === permission.PermisoId);
            let newPermissions: Permission[];

            if (isCurrentlyChecked && !forceCheck) {
                // LÓGICA DE DESMARCAR
                newPermissions = currentPermissions.filter(p => p.PermisoId !== permission.PermisoId);
                
                // Desmarcar dependientes (siempre, no solo en no-batch)
                Object.entries(dependencies).forEach(([child, parent]) => {
                    if (parent === permission.NombrePermiso) {
                        const childPermission = allPermissions.find(p => p.NombrePermiso === child);
                        if (childPermission) {
                            newPermissions = newPermissions.filter(p => p.PermisoId !== childPermission.PermisoId);
                        }
                    }
                });
            } else if (!isCurrentlyChecked) {
                // LÓGICA DE MARCAR
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
                return prev;
            }

            const uniquePerms = Array.from(new Set(newPermissions.map(p => p.PermisoId)))
                                    .map(id => allPermissions.find(p => p.PermisoId === id)!);
                                    
            return { ...prev, Permisos: uniquePerms };
        });
    };

    // --- NUEVA FUNCIÓN: Manejo inteligente de grupos (Batch) ---
    const handleToggleGroup = (groupPermissions: Permission[], select: boolean) => {
        setFormData(prev => {
            const currentPerms = prev.Permisos || [];
            const currentIds = new Set(currentPerms.map(p => p.PermisoId));
            
            if (select) {
                // 1. Agregar todos los permisos del grupo
                groupPermissions.forEach(p => currentIds.add(p.PermisoId));
                
                // 2. Resolver dependencias hacia arriba (Si activo hijo, activo padre)
                // Iteramos hasta que no haya cambios para asegurar cadenas de dependencia
                let changed = true;
                while(changed) {
                    changed = false;
                    Object.entries(dependencies).forEach(([childName, parentName]) => {
                        const child = allPermissions.find(p => p.NombrePermiso === childName);
                        const parent = allPermissions.find(p => p.NombrePermiso === parentName);
                        
                        if (child && parent && currentIds.has(child.PermisoId) && !currentIds.has(parent.PermisoId)) {
                            currentIds.add(parent.PermisoId);
                            changed = true;
                        }
                    });
                }
            } else {
                // 1. Quitar todos los permisos del grupo
                groupPermissions.forEach(p => currentIds.delete(p.PermisoId));
                
                // 2. Resolver dependencias hacia abajo (Si quito padre, quito hijo)
                let changed = true;
                while(changed) {
                    changed = false;
                    Object.entries(dependencies).forEach(([childName, parentName]) => {
                        const child = allPermissions.find(p => p.NombrePermiso === childName);
                        const parent = allPermissions.find(p => p.NombrePermiso === parentName);
                        
                        if (child && parent && !currentIds.has(parent.PermisoId) && currentIds.has(child.PermisoId)) {
                            currentIds.delete(child.PermisoId);
                            changed = true;
                        }
                    });
                }
            }
            
            return {
                ...prev,
                Permisos: allPermissions.filter(p => currentIds.has(p.PermisoId))
            };
        });
    };

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
                
                {/* SECCIÓN FIJA: Información del Rol */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Settings size={18} className="text-slate-500" /> Información del Rol
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="roleName" className="block text-sm font-medium text-slate-700">Nombre del Rol</label>
                            <Tooltip text="El nombre único para identificar este rol.">
                                <input 
                                    id="roleName"
                                    type="text" 
                                    value={formData.NombreRol} 
                                    onChange={e => setFormData(prev => ({ ...prev, NombreRol: e.target.value }))} 
                                    className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500] focus:outline-none" 
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
                                    className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500] focus:outline-none" 
                                />
                            </Tooltip>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN DE PESTAÑAS */}
                <div>
                    <div className="flex items-center gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setActiveTab('operational')}
                            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'operational' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            <CalendarClock size={16} />
                            Operación
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('visual')}
                            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'visual' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            <BarChart3 size={16} />
                            Visualización
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('catalogs')}
                            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'catalogs' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            <Folder size={16} />
                            Catálogos
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('admin')}
                            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'admin' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                        >
                            <Shield size={16} />
                            Administración
                        </button>
                    </div>

                    {/* CONTENIDO DE LA PESTAÑA ACTIVA */}
                    <div className="min-h-[300px] animate-in fade-in slide-in-from-left-1 duration-200">
                        {activeTab === 'operational' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {categories.operational.length > 0 ? categories.operational.map(groupKey => (
                                    <PermissionGroup 
                                        key={groupKey} groupKey={groupKey} group={groups[groupKey]}
                                        formData={formData} handlePermissionChange={handlePermissionChange}
                                        dependencies={dependencies} allPermissions={allPermissions}
                                        onToggleGroup={handleToggleGroup}
                                    />
                                )) : <p className="text-slate-400 text-sm p-4 text-center col-span-full">No hay permisos operativos disponibles.</p>}
                            </div>
                        )}

                        {activeTab === 'visual' && (
                            <div className="flex flex-col gap-2">
                                {categories.visual.length > 0 ? categories.visual.map(groupKey => (
                                    <VisualPermissionGrid 
                                        key={groupKey} group={groups[groupKey]}
                                        formData={formData} handlePermissionChange={handlePermissionChange}
                                    />
                                )) : <p className="text-slate-400 text-sm p-4 text-center">No hay permisos de visualización disponibles.</p>}
                            </div>
                        )}

                        {activeTab === 'catalogs' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {categories.catalogs.length > 0 ? categories.catalogs.map(groupKey => (
                                    <PermissionGroup 
                                        key={groupKey} groupKey={groupKey} group={groups[groupKey]}
                                        formData={formData} handlePermissionChange={handlePermissionChange}
                                        dependencies={dependencies} allPermissions={allPermissions}
                                        onToggleGroup={handleToggleGroup}
                                    />
                                )) : <p className="text-slate-400 text-sm p-4 text-center col-span-full">No hay permisos de catálogos disponibles.</p>}
                            </div>
                        )}

                        {activeTab === 'admin' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {categories.admin.length > 0 ? categories.admin.map(groupKey => (
                                    <PermissionGroup 
                                        key={groupKey} groupKey={groupKey} group={groups[groupKey]}
                                        formData={formData} handlePermissionChange={handlePermissionChange}
                                        dependencies={dependencies} allPermissions={allPermissions}
                                        onToggleGroup={handleToggleGroup}
                                    />
                                )) : <p className="text-slate-400 text-sm p-4 text-center col-span-full">No hay permisos administrativos disponibles.</p>}
                            </div>
                        )}
                    </div>
                </div>

            </form>
        </Modal>
    );
};
