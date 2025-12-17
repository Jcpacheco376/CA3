// src/features/admin/UserModal.tsx
import { API_BASE_URL } from '../../config/api.ts';
import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types/index.ts';
import { ClipboardIcon, KeyIcon, EyeIcon, EyeOffIcon } from '../../components/ui/Icons.tsx';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import { 
    Shield, Building, Briefcase, Tag, MapPin, Check, 
    CheckCheck, XCircle, ChevronDown, Crown 
} from 'lucide-react'; // Importé Crown para el icono de principal

// --- Componentes UI Auxiliares (Checkbox, Toggle, Collapsible) ---
// (Se mantienen idénticos a tu versión original para respetar estilos)

const Checkbox = ({ id, label, checked, onChange }: { id: string | number, label: string, checked: boolean, onChange: (checked: boolean) => void }) => {
    return (
        <label htmlFor={`cb-local-${id}`} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors">
            <div className="relative w-5 h-5 shrink-0">
                <input id={`cb-local-${id}`} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer appearance-none w-5 h-5 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[--theme-500]"/>
                <div className="absolute inset-0 w-full h-full rounded-md border-2 border-slate-300 peer-checked:bg-[--theme-500] peer-checked:border-[--theme-500] transition-colors pointer-events-none"></div>
                <Check size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white pointer-events-none transition-opacity opacity-0 peer-checked:opacity-100" />
            </div>
            <span className="text-sm text-slate-700 select-none truncate" title={label}>{label}</span>
        </label>
    );
};

const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: (enabled: boolean) => void }) => (
    <button type="button" onClick={() => onChange(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-[--theme-500]' : 'bg-gray-200'}`}>
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const CollapsibleSection = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 bg-white hover:bg-slate-50 transition-colors">
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <ChevronDown size={20} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="p-4 pt-0 border-t border-slate-100">{children}</div>}
        </div>
    );
};

// --- Componente de Catálogo (Idéntico a tu original) ---
const CatalogSection = ({ title, icon, items, selectedItems, onItemsChange, keyField, labelField, loading, error }: any) => {
    const allSelected = items.length > 0 && selectedItems.length === items.length;
    const handleToggleAll = () => allSelected ? onItemsChange([]) : onItemsChange(items);
    
    const handleToggle = (item: any) => {
        const itemId = item[keyField];
        const isSelected = selectedItems.some((s: any) => s[keyField] === itemId);
        onItemsChange(isSelected ? selectedItems.filter((s: any) => s[keyField] !== itemId) : [...selectedItems, item]);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-2 px-1">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">{icon} {title}</h4>
                <Tooltip text={allSelected ? "Limpiar todo" : "Marcar todos"}>
                    <button type="button" onClick={handleToggleAll} className={`p-1 transition-colors ${allSelected ? 'text-red-500 hover:text-red-700' : 'text-slate-400 hover:text-[--theme-500]'}`}>
                        {allSelected ? <XCircle size={16} /> : <CheckCheck size={16} />}
                    </button>
                </Tooltip>
            </div>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 flex-1 min-h-[180px]">
                <div className="max-h-48 h-full overflow-y-auto space-y-1 custom-scrollbar">
                    {loading && <p className="text-xs text-slate-400 p-2">Cargando...</p>}
                    {error && <p className="text-xs text-red-500 p-2">{error}</p>}
                    {!loading && !error && items.length === 0 && <p className="text-xs text-slate-400 p-2">Sin datos disponibles.</p>}
                    {!loading && !error && items.map((item: any) => (
                        <Checkbox key={item[keyField]} id={`${keyField}-${item[keyField]}`} label={item[labelField]} 
                            checked={selectedItems?.some((s: any) => s[keyField] === item[keyField]) || false} 
                            onChange={() => handleToggle(item)} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Modal de Confirmación (Estilo consistente) ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <div className="mt-2 text-sm text-slate-600">{children}</div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="danger" onClick={onConfirm}>Confirmar</Button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export const UserModal = ({ user, allRoles, onClose, onSave, isOpen }: { user: User | null; allRoles: Role[]; onClose: () => void; onSave: (user: User, password?: string) => void; isOpen: boolean; }) => {
    const { getToken, user: adminUser } = useAuth(); 
    const activeFilters = adminUser?.activeFilters; 
    
    const [formData, setFormData] = useState<Partial<User>>({});
    
    // UI Local States
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Estado para el ID del Rol Principal (Visualmente seleccionado)
    const [principalRoleId, setPrincipalRoleId] = useState<number | null>(null);

    // Estados de catálogos
    const [allDepartamentos, setAllDepartamentos] = useState<any[]>([]);
    const [allGruposNomina, setAllGruposNomina] = useState<any[]>([]);
    const [allPuestos, setAllPuestos] = useState<any[]>([]);
    const [allEstablecimientos, setAllEstablecimientos] = useState<any[]>([]);
    const [catalogsLoading, setCatalogsLoading] = useState(false);
    const [catalogsError, setCatalogsError] = useState<string | null>(null);

    const isNewUser = !user?.UsuarioId;
    
    // Efecto de Carga Inicial
    useEffect(() => {
        const fetchCatalogsAndNextId = async () => {
            const token = getToken();
            if (!token) { setCatalogsError('Sesión no válida.'); return; }
            const headers = { 'Authorization': `Bearer ${token}` };
            setCatalogsLoading(true);
            setCatalogsError(null);
            
            try {
                const requests = [];
                if (activeFilters?.departamentos) requests.push(fetch(`${API_BASE_URL}/catalogs/departamentos`, { headers }));
                if (activeFilters?.gruposNomina) requests.push(fetch(`${API_BASE_URL}/catalogs/grupos-nomina`, { headers }));
                if (activeFilters?.puestos) requests.push(fetch(`${API_BASE_URL}/catalogs/puestos`, { headers }));
                if (activeFilters?.establecimientos) requests.push(fetch(`${API_BASE_URL}/catalogs/establecimientos`, { headers }));
                if (!user) requests.push(fetch(`${API_BASE_URL}/users/next-id`, { headers }));

                const responses = await Promise.all(requests);
                let nextIdRes;
                if (!user) nextIdRes = responses.pop();

                for (const res of responses) {
                    if (!res.ok) throw new Error('Error cargando catálogos.');
                    const data = await res.json();
                    if (res.url.includes('/departamentos')) setAllDepartamentos(data);
                    else if (res.url.includes('/grupos-nomina')) setAllGruposNomina(data);
                    else if (res.url.includes('/puestos')) setAllPuestos(data);
                    else if (res.url.includes('/establecimientos')) setAllEstablecimientos(data);
                }

                if (nextIdRes && nextIdRes.ok) {
                    const { NextUsuarioId } = await nextIdRes.json();
                    setFormData(prev => ({ ...prev, UsuarioId: NextUsuarioId }));
                }

            } catch (error: any) { setCatalogsError(error.message); } 
            finally { setCatalogsLoading(false); }
        };
        
        if(isOpen && activeFilters) {
            if (user) {
                setFormData({ ...user, Roles: user.Roles || [], Departamentos: user.Departamentos || [], GruposNomina: user.GruposNomina || [], Puestos: user.Puestos || [], Establecimientos: user.Establecimientos || [] });
                // LÓGICA: El índice 0 es el principal por defecto al cargar
                if (user.Roles && user.Roles.length > 0) {
                    setPrincipalRoleId(user.Roles[0].RoleId);
                } else {
                    setPrincipalRoleId(null);
                }
            } else {
                setFormData({ NombreCompleto: '', NombreUsuario: '', Email: '', EstaActivo: true, Roles: [], Departamentos: [], GruposNomina: [], Puestos: [], Establecimientos: [] });
                setPrincipalRoleId(null);
            }
            fetchCatalogsAndNextId();
            setPassword('');
            setPasswordError('');
            setGeneratedPassword(null);
            setCopied(false);
        }
    }, [user, isOpen, getToken, activeFilters]);

    // Manejadores
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRolesChange = (items: Role[]) => {
        setFormData(prev => ({ ...prev, Roles: items }));
        // Si el rol que era principal se quitó, asignamos el nuevo "primero" de la lista
        if (principalRoleId && !items.find(r => r.RoleId === principalRoleId)) {
            setPrincipalRoleId(items.length > 0 ? items[0].RoleId : null);
        } else if (!principalRoleId && items.length > 0) {
            setPrincipalRoleId(items[0].RoleId);
        }
    };

    // Funciones auxiliares de catálogos (Departamentos, etc.) se mantienen igual...
    const handleDepartamentosChange = (items: any[]) => setFormData(prev => ({ ...prev, Departamentos: items }));
    const handleGruposChange = (items: any[]) => setFormData(prev => ({ ...prev, GruposNomina: items }));
    const handlePuestosChange = (items: any[]) => setFormData(prev => ({ ...prev, Puestos: items }));
    const handleEstablecimientosChange = (items: any[]) => setFormData(prev => ({ ...prev, Establecimientos: items }));
    
    // Contraseña
    const handleResetPassword = () => { 
        const newPass = Math.random().toString(36).substring(2, 10);
        setGeneratedPassword(newPass); setPassword(newPass); setIsConfirmOpen(false);
    };
    const handleCopyToClipboard = () => { 
        if (generatedPassword) { navigator.clipboard.writeText(generatedPassword).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); } 
    };
    
    // --- SUBMIT ---
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isNewUser && password.length < 6) { setPasswordError("Mínimo 6 caracteres."); return; }
        if (!isNewUser && password.length > 0 && password.length < 6) { setPasswordError("Mínimo 6 caracteres."); return; }

        const passwordToSend = password.length > 0 ? password : undefined;
        
        // --- AQUÍ ESTÁ LA LÓGICA IMPLÍCITA QUE PEDISTE ---
        // Ordenamos el array: El Rol seleccionado como Principal va primero [0], el resto después.
        let sortedRoles = [...(formData.Roles || [])];
        if (principalRoleId) {
            const mainRole = sortedRoles.find(r => r.RoleId === principalRoleId);
            const others = sortedRoles.filter(r => r.RoleId !== principalRoleId);
            if (mainRole) {
                sortedRoles = [mainRole, ...others];
            }
        }

        const dataToSave = { ...formData, Roles: sortedRoles }; // Enviamos ya ordenado
        onSave(dataToSave as User, passwordToSend); 
    };

    const renderPasswordField = () => {
        // (Código de renderizado de password idéntico al anterior)
        return (
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                        <input 
                            type={isPasswordVisible ? 'text' : 'password'} 
                            placeholder={!isNewUser ? "Dejar en blanco para mantener actual" : ""}
                            value={password} 
                            onChange={e => { setPassword(e.target.value); setPasswordError(''); setGeneratedPassword(null); }} 
                            className={`w-full p-2 border rounded-md text-sm ${passwordError ? 'border-red-500' : 'border-slate-300'} focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500] focus:outline-none`}
                            required={isNewUser}
                        />
                        <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                            {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>
                    {!isNewUser && (
                        <Tooltip text="Generar nueva">
                            <button type="button" onClick={() => setIsConfirmOpen(true)} className="p-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-md hover:bg-slate-200 transition-colors">
                                <KeyIcon />
                            </button>
                        </Tooltip>
                    )}
                </div>
                {generatedPassword && ( 
                    <div className="mt-2 bg-slate-50 border border-slate-200 p-2 rounded-md flex justify-between items-center animate-in fade-in slide-in-from-top-1">
                        <span className="text-sm text-slate-700 font-mono select-all">{generatedPassword}</span>
                        <Tooltip text={copied ? "¡Copiado!" : "Copiar"}>
                            <button type="button" onClick={handleCopyToClipboard} className="p-1 text-slate-400 hover:text-[--theme-500]">
                                {copied ? <Check size={16} /> : <ClipboardIcon />}
                            </button>
                        </Tooltip>
                    </div>
                )}
                {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
            </div>
        );
    };
    
    const footer = (
        <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="user-modal-form">Guardar</Button>
        </>
    );

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={isNewUser ? 'Nuevo Usuario' : 'Editar Usuario'} footer={footer} size="3xl">
                <form id="user-modal-form" onSubmit={handleSubmit} className="space-y-5">
                    
                    <CollapsibleSection title="Información General">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                                <input type="text" name="NombreCompleto" value={formData.NombreCompleto || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500] focus:outline-none" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input type="email" name="Email" value={formData.Email || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500] focus:outline-none" required />
                            </div>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection title="Acceso y Roles">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-1">
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">ID</label>
                                        <input type="text" value={formData.UsuarioId || ''} className="w-full p-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-md text-sm" disabled />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                                        <input type="text" name="NombreUsuario" value={formData.NombreUsuario || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-md text-sm focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500] focus:outline-none" required />
                                    </div>
                                </div>
                                {renderPasswordField()}
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col h-full">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <h4 className="font-semibold text-slate-800 flex items-center gap-2 text-sm"><Shield size={16} /> Roles</h4>
                                        <Tooltip text={allRoles.length > 0 && formData.Roles?.length === allRoles.length ? "Limpiar todo" : "Marcar todos"}>
                                            <button type="button" onClick={() => {
                                                const allSelected = allRoles.length > 0 && formData.Roles?.length === allRoles.length;
                                                handleRolesChange(allSelected ? [] : allRoles);
                                            }} className={`p-1 transition-colors ${allRoles.length > 0 && formData.Roles?.length === allRoles.length ? 'text-red-500 hover:text-red-700' : 'text-slate-400 hover:text-[--theme-500]'}`}>
                                                {allRoles.length > 0 && formData.Roles?.length === allRoles.length ? <XCircle size={16} /> : <CheckCheck size={16} />}
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 flex-1 min-h-[220px]">
                                        <div className="max-h-56 h-full overflow-y-auto space-y-px custom-scrollbar pr-1">
                                            {(!allRoles.length && !catalogsError && !catalogsLoading) && <p className="text-xs text-slate-400 p-2">Sin datos disponibles.</p>}
                                            {(catalogsLoading) && <p className="text-xs text-slate-400 p-2">Cargando...</p>}
                                            {catalogsError && <p className="text-xs text-red-500 p-2">{catalogsError}</p>}
                                            
                                            {allRoles.map((role: Role) => {
                                                const isSelected = formData.Roles?.some((r: Role) => r.RoleId === role.RoleId) || false;
                                                const isPrincipal = principalRoleId === role.RoleId;

                                                const handleSetPrincipal = () => {
                                                    setPrincipalRoleId(role.RoleId);
                                                    if (!isSelected) {
                                                        const newSelectedRoles = [...(formData.Roles || []), role];
                                                        handleRolesChange(newSelectedRoles);
                                                    }
                                                };

                                                const handleToggle = (checked: boolean) => {
                                                    const newSelectedRoles = checked
                                                        ? [...(formData.Roles || []), role]
                                                        : formData.Roles?.filter(r => r.RoleId !== role.RoleId) || [];
                                                    handleRolesChange(newSelectedRoles);
                                                };

                                                return (
                                                    <div key={role.RoleId} className="flex items-center justify-between group rounded-md hover:bg-slate-100 transition-colors">
                                                        <label htmlFor={`role-${role.RoleId}`} className="flex-grow flex items-center space-x-3 p-2 cursor-pointer">
                                                            <div className="relative w-5 h-5 shrink-0">
                                                                <input id={`role-${role.RoleId}`} type="checkbox" checked={isSelected} onChange={(e) => handleToggle(e.target.checked)} className="peer appearance-none w-5 h-5 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[--theme-500]"/>
                                                                <div className="absolute inset-0 w-full h-full rounded-md border-2 border-slate-300 peer-checked:bg-[--theme-500] peer-checked:border-[--theme-500] transition-colors pointer-events-none"></div>
                                                                <Check size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white pointer-events-none transition-opacity opacity-0 peer-checked:opacity-100" />
                                                            </div>
                                                            <span className="text-sm text-slate-700 select-none truncate" title={role.NombreRol}>{role.NombreRol}</span>
                                                        </label>

                                                        <Tooltip text="Marcar como Principal">
                                                            <button
                                                                type="button"
                                                                onClick={handleSetPrincipal}
                                                                className={`p-2 transition-opacity ${isPrincipal ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                                                            >
                                                                <Crown size={16} className={`transition-colors duration-200 ${isPrincipal ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CollapsibleSection>
                    
                    {(activeFilters?.departamentos || activeFilters?.gruposNomina || activeFilters?.puestos || activeFilters?.establecimientos) && (
                        <CollapsibleSection title="Permisos de Datos (Filtros)">
                            <p className="text-xs text-slate-500 mb-3 italic">
                                * Limita la información que el usuario puede visualizar en reportes y listas.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeFilters?.departamentos && <CatalogSection title="Departamentos" icon={<Building size={14} />} items={allDepartamentos} selectedItems={formData.Departamentos || []} onItemsChange={handleDepartamentosChange} keyField="DepartamentoId" labelField="Nombre" loading={catalogsLoading} error={catalogsError} />}
                                {activeFilters?.gruposNomina && <CatalogSection title="Grupos Nómina" icon={<Briefcase size={14} />} items={allGruposNomina} selectedItems={formData.GruposNomina || []} onItemsChange={handleGruposChange} keyField="GrupoNominaId" labelField="Nombre" loading={catalogsLoading} error={catalogsError} />}
                                {activeFilters?.puestos && <CatalogSection title="Puestos" icon={<Tag size={14} />} items={allPuestos} selectedItems={formData.Puestos || []} onItemsChange={handlePuestosChange} keyField="PuestoId" labelField="Nombre" loading={catalogsLoading} error={catalogsError} />}
                                {activeFilters?.establecimientos && <CatalogSection title="Establecimientos" icon={<MapPin size={14} />} items={allEstablecimientos} selectedItems={formData.Establecimientos || []} onItemsChange={handleEstablecimientosChange} keyField="EstablecimientoId" labelField="Nombre" loading={catalogsLoading} error={catalogsError} />}
                            </div>
                        </CollapsibleSection>
                    )}
                    
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                         <label className="flex items-center space-x-3 cursor-pointer">
                            <Toggle enabled={formData.EstaActivo || false} onChange={(enabled) => setFormData(prev => ({...prev, EstaActivo: enabled}))}/>
                            <span className={`text-sm font-medium ${formData.EstaActivo ? 'text-slate-800' : 'text-slate-400'}`}>
                                {formData.EstaActivo ? 'Usuario Habilitado' : 'Usuario Deshabilitado'}
                            </span>
                        </label>
                    </div>
                </form>
            </Modal>
            
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleResetPassword} title="Restablecer Contraseña">
                <p>¿Estás seguro? Se generará una nueva clave aleatoria. <br/><span className="text-xs text-slate-500 mt-2 block">Nota: Debes guardar el formulario principal para aplicar el cambio.</span></p>
            </ConfirmationModal>
        </>
    );
};