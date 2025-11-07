// src/features/admin/UserModal.tsx
import { API_BASE_URL } from '../../config/api.ts';
import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types/index.ts';
import { ClipboardIcon, KeyIcon, EyeIcon, EyeOffIcon } from '../../components/ui/Icons.tsx';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
// --- MODIFICACIÓN: Importaciones completas ---
import { 
    Shield, Building, Briefcase, Tag, MapPin, Check, 
    CheckCheck, XCircle, ChevronDown 
} from 'lucide-react';

// --- Checkbox Local (Corregido) ---
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
            <span className="text-sm text-slate-700 select-none truncate" title={label}>
                {label}
            </span>
        </label>
    );
};

// --- Toggle (Sin cambios) ---
const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: (enabled: boolean) => void }) => (
    <button type="button" onClick={() => onChange(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-[--theme-500]' : 'bg-gray-200'}`}>
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

// --- MODIFICACIÓN: Sección Colapsable ---
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
                <ChevronDown size={20} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 pt-0">
                    {children}
                </div>
            )}
        </div>
    );
};
// --- FIN Sección Colapsable ---

// --- MODIFICACIÓN: Componente de Catálogo rediseñado ---
const CatalogSection = ({ 
    title, icon, items, selectedItems, onItemsChange, 
    keyField, labelField, loading, error 
}: {
    title: string,
    icon: React.ReactNode,
    items: any[],
    selectedItems: any[],
    onItemsChange: (newItems: any[]) => void,
    keyField: string,
    labelField: string,
    loading: boolean,
    error: string | null
}) => {
    
    const allSelected = items.length > 0 && selectedItems.length === items.length;

    const handleToggleAll = () => {
        if (allSelected) {
            onItemsChange([]); // Limpiar
        } else {
            onItemsChange(items); // Marcar todos
        }
    };

    const handleToggle = (item: any) => {
        const itemId = item[keyField];
        const isSelected = selectedItems.some((s: any) => s[keyField] === itemId);
        let newList;
        if (isSelected) {
            newList = selectedItems.filter((s: any) => s[keyField] !== itemId);
        } else {
            newList = [...selectedItems, item];
        }
        onItemsChange(newList);
    };

    return (
        <div className="flex flex-col h-full">
            {/* 1. Encabezado con Título y Botón Unificado */}
            <div className="flex justify-between items-center mb-2 px-1">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    {icon}
                    {title}
                </h4>
                <Tooltip text={allSelected ? "Limpiar todo" : "Marcar todos"}>
                    <button 
                        type="button" 
                        onClick={handleToggleAll} 
                        className={`p-1 ${allSelected ? 'text-red-500 hover:text-red-700' : 'text-slate-400 hover:text-blue-500'}`}
                    >
                        {allSelected ? <XCircle size={16} /> : <CheckCheck size={16} />}
                    </button>
                </Tooltip>
            </div>

            {/* 2. Contenedor de la lista */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 flex-1 min-h-[200px]">
                <div className="max-h-48 h-full overflow-y-auto space-y-1">
                    {loading && <p className="text-sm text-slate-400 p-2">Cargando...</p>}
                    {error && <p className="text-sm text-red-500 p-2">{error}</p>}
                    {!loading && !error && items.length === 0 && (
                        <p className="text-sm text-slate-400 p-2">No hay {title.toLowerCase()} disponibles.</p>
                    )}
                    {!loading && !error && items.map((item: any) => (
                        <Checkbox 
                            key={item[keyField]} 
                            id={`${keyField}-${item[keyField]}`} 
                            label={item[labelField]} 
                            checked={selectedItems?.some((s: any) => s[keyField] === item[keyField]) || false} 
                            onChange={() => handleToggle(item)} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
// --- FIN Componente Catálogo ---

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children }: any) => {
    // ... (sin cambios)
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
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


export const UserModal = ({ user, allRoles, onClose, onSave, isOpen }: { user: User | null; allRoles: Role[]; onClose: () => void; onSave: (user: User, password?: string) => void; isOpen: boolean; }) => {
    const { getToken, user: adminUser } = useAuth(); 
    const activeFilters = adminUser?.activeFilters; 
    
    const [formData, setFormData] = useState<Partial<User>>({});
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const [allDepartamentos, setAllDepartamentos] = useState<any[]>([]);
    const [allGruposNomina, setAllGruposNomina] = useState<any[]>([]);
    const [allPuestos, setAllPuestos] = useState<any[]>([]);
    const [allEstablecimientos, setAllEstablecimientos] = useState<any[]>([]);
    
    const [catalogsLoading, setCatalogsLoading] = useState(false);
    const [catalogsError, setCatalogsError] = useState<string | null>(null);

    const isNewUser = !user?.UsuarioId;
    
    // ... (useEffect de fetchCatalogsAndNextId SIN CAMBIOS) ...
    useEffect(() => {
        const fetchCatalogsAndNextId = async () => {
            const token = getToken();
            if (!token) { setCatalogsError('Sesión no válida.'); return; }
            const headers = { 'Authorization': `Bearer ${token}` };

            setCatalogsLoading(true);
            setCatalogsError(null);
            
            try {
                const requests = [];
                
                if (activeFilters?.departamentos) {
                    requests.push(fetch(`${API_BASE_URL}/catalogs/departamentos`, { headers }));
                }
                if (activeFilters?.gruposNomina) {
                    requests.push(fetch(`${API_BASE_URL}/catalogs/grupos-nomina`, { headers }));
                }
                if (activeFilters?.puestos) {
                    requests.push(fetch(`${API_BASE_URL}/catalogs/puestos`, { headers }));
                }
                if (activeFilters?.establecimientos) {
                    requests.push(fetch(`${API_BASE_URL}/catalogs/establecimientos`, { headers }));
                }
                
                if (!user) { 
                    requests.push(fetch(`${API_BASE_URL}/users/next-id`, { headers }));
                }

                const responses = await Promise.all(requests);
                
                let nextIdRes;
                if (!user) {
                    nextIdRes = responses.pop();
                }

                for (const res of responses) {
                    if (!res.ok) throw new Error('No se pudieron cargar los catálogos.');
                    const data = await res.json();
                    
                    if (res.url.includes('/departamentos')) setAllDepartamentos(data);
                    else if (res.url.includes('/grupos-nomina')) setAllGruposNomina(data);
                    else if (res.url.includes('/puestos')) setAllPuestos(data);
                    else if (res.url.includes('/establecimientos')) setAllEstablecimientos(data);
                }

                if (nextIdRes) {
                    if (!nextIdRes.ok) throw new Error('No se pudo obtener el ID de usuario.');
                    const { NextUsuarioId } = await nextIdRes.json();
                    setFormData(prev => ({ ...prev, UsuarioId: NextUsuarioId }));
                }

            } catch (error: any) { setCatalogsError(error.message); } 
            finally { setCatalogsLoading(false); }
        };
        
        if(isOpen && activeFilters) {
            if (user) {
                setFormData({ ...user, Roles: user.Roles || [], Departamentos: user.Departamentos || [], GruposNomina: user.GruposNomina || [], Puestos: user.Puestos || [], Establecimientos: user.Establecimientos || [] });
            } else {
                setFormData({ NombreCompleto: '', NombreUsuario: '', Email: '', EstaActivo: true, Roles: [], Departamentos: [], GruposNomina: [], Puestos: [], Establecimientos: [] });
            }
            
            fetchCatalogsAndNextId();
            setPassword('');
            setPasswordError('');
            setGeneratedPassword(null);
            setCopied(false);
        }
    }, [user, isOpen, getToken, activeFilters]);


    // ... (handleChange SIN CAMBIOS) ...
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- MODIFICACIÓN: Simplificamos los handlers ---
    const handleRolesChange = (items: Role[]) => {
        setFormData(prev => ({ ...prev, Roles: items }));
    };
    const handleDepartamentosChange = (items: any[]) => {
        setFormData(prev => ({ ...prev, Departamentos: items }));
    };
    const handleGruposChange = (items: any[]) => {
        setFormData(prev => ({ ...prev, GruposNomina: items }));
    };
    const handlePuestosChange = (items: any[]) => {
        setFormData(prev => ({ ...prev, Puestos: items }));
    };
    const handleEstablecimientosChange = (items: any[]) => {
        setFormData(prev => ({ ...prev, Establecimientos: items }));
    };
    // --- FIN MODIFICACIÓN ---

    // ... (handleResetPassword, handleCopyToClipboard SIN CAMBIOS, el bug se corrige en handleSubmit) ...
    const handleResetPassword = () => { 
        const newPass = Math.random().toString(36).substring(2, 10);
        setGeneratedPassword(newPass);
        setPassword(newPass); // <-- Esto SÍ estaba bien
        setIsConfirmOpen(false);
    };
    const handleCopyToClipboard = () => { if (generatedPassword) {
            navigator.clipboard.writeText(generatedPassword).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        } 
    };
    
    // --- MODIFICACIÓN: Corrección del bug de contraseña ---
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // 1. Validar nueva contraseña si es usuario nuevo
        if (isNewUser && password.length < 6) {
            setPasswordError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        // 2. Validar si se escribió una nueva contraseña (no generada) al editar
        if (!isNewUser && password.length > 0 && password.length < 6) {
             setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
             return;
        }

        // 3. (LA CORRECCIÓN) Enviar 'undefined' si el campo está vacío, 
        // para que el backend (SP) sepa que no debe cambiarla.
        const passwordToSend = password.length > 0 ? password : undefined;
        
        onSave(formData as User, passwordToSend); 
    };

    const footer = (
        <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="user-modal-form">Guardar</Button>
        </>
    );

    // --- Campo de contraseña unificado (para nuevo o existente) ---
    const renderPasswordField = () => {
        if (!isNewUser) {
            // Usuario existente: botón de reseteo + campo para escribir una nueva
            return (
                <div>
                    <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="relative flex-grow">
                            <input 
                                type={isPasswordVisible ? 'text' : 'password'} 
                                placeholder="Dejar en blanco para no cambiar"
                                value={generatedPassword || password} // Muestra pass generada o la escrita
                                onChange={e => { 
                                    setPassword(e.target.value); 
                                    setPasswordError(''); 
                                    setGeneratedPassword(null); // Borra la generada si empieza a escribir
                                }} 
                                className={`w-full p-2 border rounded-md ${passwordError ? 'border-red-500' : 'border-slate-300'} focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]`}
                            />
                            <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                                {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        <Tooltip text="Generar contraseña segura">
                            <button 
                                type="button" 
                                onClick={() => setIsConfirmOpen(true)} 
                                className="p-2 bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200"
                            >
                                <KeyIcon />
                            </button>
                        </Tooltip>
                        {generatedPassword && (
                            <Tooltip text={copied ? "¡Copiado!" : "Copiar contraseña generada"}>
                                <button type="button" onClick={handleCopyToClipboard} className={`p-2 rounded-md ${copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                    {copied ? <Check size={16} /> : <ClipboardIcon />}
                                </button>
                            </Tooltip>
                        )}
                    </div>
                </div>
            );
        }

        // Usuario nuevo: campo de contraseña simple
        return (
            <div>
                <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                <div className="relative mt-1">
                    <input 
                        type={isPasswordVisible ? 'text' : 'password'} 
                        value={password} 
                        onChange={e => { setPassword(e.target.value); setPasswordError(''); }} 
                        className={`w-full p-2 border rounded-md ${passwordError ? 'border-red-500' : 'border-slate-300'} focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]`} 
                        required={isNewUser} 
                    />
                    <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                        {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                </div>
            </div>
        );
    };
    
    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={isNewUser ? 'Crear Usuario' : 'Editar Usuario'} footer={footer} size="3xl">
                <form id="user-modal-form" onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* --- SECCIÓN 1: INFORMACIÓN (Colapsable) --- */}
                    <CollapsibleSection title="Información de Usuario">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Nombre Completo</label>
                                <input type="text" name="NombreCompleto" value={formData.NombreCompleto || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Email</label>
                                <input type="email" name="Email" value={formData.Email || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" required />
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* --- SECCIÓN 2: SEGURIDAD Y ROLES (Colapsable) --- */}
                    <CollapsibleSection title="Seguridad y Roles">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Columna Izquierda: Credenciales */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">ID de Usuario</label>
                                    <input type="number" name="UsuarioId" value={formData.UsuarioId || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md bg-slate-100" required disabled />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Nombre de Usuario</label>
                                    <input type="text" name="NombreUsuario" value={formData.NombreUsuario || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" required />
                                </div>
                                {renderPasswordField()}
                                {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
                            </div>

                            {/* Columna Derecha: Roles */}
                            <CatalogSection 
                                title="Roles"
                                icon={<Shield size={18} />}
                                items={allRoles}
                                selectedItems={formData.Roles || []}
                                onItemsChange={handleRolesChange}
                                keyField="RoleId"
                                labelField="NombreRol"
                                loading={!allRoles.length && !catalogsError}
                                error={null}
                            />
                        </div>
                    </CollapsibleSection>
                    
                    {/* --- SECCIÓN 3: FILTROS DE DATOS (Colapsable y Dinámica) --- */}
                    {(activeFilters?.departamentos || activeFilters?.gruposNomina || activeFilters?.puestos || activeFilters?.establecimientos) && (
                        <CollapsibleSection title="Filtros de Datos (Restricciones)">
                            <p className="text-sm text-slate-500 mb-4">
                                Define qué datos puede ver este usuario. Si no seleccionas nada, no tendrá restricciones (verá todo).
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {activeFilters?.departamentos && (
                                    <CatalogSection
                                        title="Departamentos"
                                        icon={<Building size={16} />}
                                        items={allDepartamentos}
                                        selectedItems={formData.Departamentos || []}
                                        onItemsChange={handleDepartamentosChange}
                                        keyField="DepartamentoId"
                                        labelField="Nombre"
                                        loading={catalogsLoading}
                                        error={catalogsError}
                                    />
                                )}

                                {activeFilters?.gruposNomina && (
                                    <CatalogSection
                                        title="Grupos Nómina"
                                        icon={<Briefcase size={16} />}
                                        items={allGruposNomina}
                                        selectedItems={formData.GruposNomina || []}
                                        onItemsChange={handleGruposChange}
                                        keyField="GrupoNominaId"
                                        labelField="Nombre"
                                        loading={catalogsLoading}
                                        error={catalogsError}
                                    />
                                )}

                                {activeFilters?.puestos && (
                                    <CatalogSection
                                        title="Puestos"
                                        icon={<Tag size={16} />}
                                        items={allPuestos}
                                        selectedItems={formData.Puestos || []}
                                        onItemsChange={handlePuestosChange}
                                        keyField="PuestoId"
                                        labelField="Nombre"
                                        loading={catalogsLoading}
                                        error={catalogsError}
                                    />
                                )}

                                {activeFilters?.establecimientos && (
                                    <CatalogSection
                                        title="Establecimientos"
                                        icon={<MapPin size={16} />}
                                        items={allEstablecimientos}
                                        selectedItems={formData.Establecimientos || []}
                                        onItemsChange={handleEstablecimientosChange}
                                        keyField="EstablecimientoId"
                                        labelField="Nombre"
                                        loading={catalogsLoading}
                                        error={catalogsError}
                                    />
                                )}
                                
                            </div>
                        </CollapsibleSection>
                    )}
                    
                    <div className="pt-4 flex items-center justify-between">
                         <label className="flex items-center space-x-3">
                            <Toggle enabled={formData.EstaActivo || false} onChange={(enabled) => setFormData(prev => ({...prev, EstaActivo: enabled}))}/>
                            <span className="text-sm font-medium text-slate-700">Usuario Activo</span>
                        </label>
                    </div>
                </form>
            </Modal>
            
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleResetPassword} title="Restablecer Contraseña">
                <p>¿Estás seguro? Se generará una nueva clave temporal segura y la anterior dejará de funcionar.</p>
            </ConfirmationModal>
        </>
    );
};