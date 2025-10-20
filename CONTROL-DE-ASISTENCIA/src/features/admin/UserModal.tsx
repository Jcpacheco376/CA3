// src/features/admin/UserModal.tsx
import { API_BASE_URL } from '../../config/api.ts';
import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types/index.ts';
import { ClipboardIcon, KeyIcon, EyeIcon, EyeOffIcon, Check } from '../../components/ui/Icons.tsx';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { useAuth } from '../auth/AuthContext.tsx';

const Checkbox = ({ id, label, checked, onChange }: any) => (
    <label htmlFor={id} className="flex items-center space-x-2 p-2 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
        <input id={id} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-gray-300 text-[--theme-500] focus:ring-[--theme-500]"/>
        <span className="text-sm text-slate-700">{label}</span>
    </label>
);

const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: (enabled: boolean) => void }) => (
    <button type="button" onClick={() => onChange(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-[--theme-500]' : 'bg-gray-200'}`}>
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const CatalogSection = ({ items, selectedItems, onSelect, keyField, labelField, loading, error, title }: any) => {
    if (loading) return <p className="text-sm text-slate-400 p-2">Cargando...</p>;
    if (error) return <p className="text-sm text-red-500 p-2">{error}</p>;
    if (!items || items.length === 0) return <p className="text-sm text-slate-400 p-2">No hay {title.toLowerCase()} disponibles.</p>;

    return items.map((item: any) => (
        <Checkbox 
            key={item[keyField]} 
            id={`${keyField}-${item[keyField]}`} 
            label={item[labelField]} 
            checked={selectedItems?.some((s: any) => s[keyField] === item[keyField]) || false} 
            onChange={() => onSelect(item)} 
        />
    ));
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children }: any) => {
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
    const { getToken } = useAuth();
    const [formData, setFormData] = useState<Partial<User>>({});
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const [allDepartamentos, setAllDepartamentos] = useState<any[]>([]);
    const [allGruposNomina, setAllGruposNomina] = useState<any[]>([]);
    const [catalogsLoading, setCatalogsLoading] = useState(false);
    const [catalogsError, setCatalogsError] = useState<string | null>(null);

    const isNewUser = !user?.UsuarioId;

    useEffect(() => {
        const fetchCatalogsAndNextId = async () => {
            const token = getToken();
            if (!token) { setCatalogsError('Sesión no válida.'); return; }
            const headers = { 'Authorization': `Bearer ${token}` };

            setCatalogsLoading(true);
            setCatalogsError(null);
            try {
                const requests = [
                    fetch(`${API_BASE_URL}/catalogs/departamentos`, { headers }),
                    fetch(`${API_BASE_URL}/catalogs/grupos-nomina`, { headers })
                ];
                
                if (!user) {
                    requests.push(fetch(`${API_BASE_URL}/users/next-id`, { headers }));
                }

                const responses = await Promise.all(requests);
                const [deptoRes, grupoRes, nextIdRes] = responses;

                if (!deptoRes.ok || !grupoRes.ok || (nextIdRes && !nextIdRes.ok)) {
                    throw new Error('No se pudieron cargar los datos necesarios.');
                }
                
                const deptoData = await deptoRes.json();
                console.log('Departamentos:', deptoData);
                setAllDepartamentos(deptoData);

                const grupoData = await grupoRes.json();
                console.log('Grupos de Nomina:', grupoData);
                setAllGruposNomina(grupoData);

                if (nextIdRes) {
                    const { NextUsuarioId } = await nextIdRes.json();
                    setFormData(prev => ({ ...prev, UsuarioId: NextUsuarioId }));
                }

            } catch (error: any) { setCatalogsError(error.message); } 
            finally { setCatalogsLoading(false); }
        };
        
        if(isOpen) {
            if (user) {
                setFormData({ ...user, Roles: user.Roles || [], Departamentos: user.Departamentos || [], GruposNomina: user.GruposNomina || [] });
            } else {
                setFormData({ NombreCompleto: '', NombreUsuario: '', Email: '', EstaActivo: true, Roles: [], Departamentos: [], GruposNomina: [] });
            }
            
            fetchCatalogsAndNextId();
            setPassword('');
            setPasswordError('');
            setGeneratedPassword(null);
            setCopied(false);
        }
    }, [user, isOpen, getToken]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMultiSelectChange = (item: any, listName: 'Departamentos' | 'GruposNomina') => {
        const currentList = (formData as any)[listName] || [];
        const itemIdField = listName === 'Departamentos' ? 'DepartamentoId' : 'GrupoNominaId';
        const itemId = item[itemIdField];
        const itemIndex = currentList.findIndex((i: any) => i[itemIdField] === itemId);

        let newList;
        if (itemIndex > -1) { newList = currentList.filter((i: any) => i[itemIdField] !== itemId); } 
        else { newList = [...currentList, item]; }
        setFormData(prev => ({ ...prev, [listName]: newList }));
    };

    const handleRoleChange = (roleId: number) => {
        const currentRoles = formData.Roles || [];
        const roleIndex = currentRoles.findIndex(r => r.RoleId === roleId);
        let newRoles;
        if (roleIndex > -1) { newRoles = currentRoles.filter(r => r.RoleId !== roleId); } 
        else { const roleToAdd = allRoles.find(r => r.RoleId === roleId); if (roleToAdd) newRoles = [...currentRoles, roleToAdd]; }
        setFormData(prev => ({ ...prev, Roles: newRoles }));
    };

    const handleResetPassword = () => {
        const newPass = Math.random().toString(36).substring(2, 10);
        setGeneratedPassword(newPass);
        setPassword(newPass);
        setIsConfirmOpen(false);
    };

    const handleCopyToClipboard = () => {
        if (generatedPassword) {
            navigator.clipboard.writeText(generatedPassword).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isNewUser && password.length < 6) {
            setPasswordError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        onSave(formData as User, password);
    };

    const footer = (
        <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="user-modal-form">Guardar</Button>
        </>
    );

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={isNewUser ? 'Crear Usuario' : 'Editar Usuario'} footer={footer} size="3xl">
                <form id="user-modal-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* SECCIÓN 1: IDENTIFICACIÓN Y CREDENCIALES */}
                    <div className="border border-slate-200 p-4 rounded-lg">
                        <h3 className="font-semibold text-slate-800 mb-3">Identificación y Credenciales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700">ID de Usuario</label>
                                <input type="number" name="UsuarioId" value={formData.UsuarioId || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md bg-slate-100" required disabled />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Nombre de Usuario</label>
                                <input type="text" name="NombreUsuario" value={formData.NombreUsuario || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">{isNewUser ? 'Contraseña' : 'Nueva Contraseña'}</label>
                                {isNewUser ? (
                                    <div className="relative">
                                        <input type={isPasswordVisible ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setPasswordError(''); }} className={`mt-1 w-full p-2 border rounded-md ${passwordError ? 'border-red-500' : 'border-slate-300'}`} required={isNewUser} />
                                        <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                                            {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => setIsConfirmOpen(true)} className="mt-1 w-full flex items-center justify-center p-2 bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 font-semibold">
                                        <KeyIcon /> <span className="ml-2">Restablecer Contraseña</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        {passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
                        {generatedPassword && (
                            <div className="mt-3 bg-green-50 p-2 rounded-md flex justify-between items-center">
                                <span className="text-sm text-green-800 font-mono">{generatedPassword}</span>
                                <Tooltip text={copied ? "¡Copiado!" : "Copiar al portapapeles"}>
                                    <button type="button" onClick={handleCopyToClipboard} className="p-1 hover:bg-green-200 rounded">
                                        {copied ? <Check size={16} className="text-green-700" /> : <ClipboardIcon />}
                                    </button>
                                </Tooltip>
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN 2: DATOS PERSONALES */}
                    <div className="border border-slate-200 p-4 rounded-lg">
                        <h3 className="font-semibold text-slate-800 mb-3">Datos Personales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Nombre Completo</label>
                                <input type="text" name="NombreCompleto" value={formData.NombreCompleto || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Email</label>
                                <input type="email" name="Email" value={formData.Email || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md" required />
                            </div>
                        </div>
                    </div>
                    
                    {/* SECCIÓN 3: ASIGNACIONES */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border border-slate-200 p-4 rounded-lg">
                            <h3 className="font-semibold text-slate-800 mb-3">Roles</h3>
                            <div className="max-h-32 overflow-y-auto space-y-2 p-1">
                                <CatalogSection title="Roles" items={allRoles} selectedItems={formData.Roles} onSelect={(role: Role) => handleRoleChange(role.RoleId)} keyField="RoleId" labelField="NombreRol" loading={!allRoles.length && !catalogsError} error={null} />
                            </div>
                        </div>
                        <div className="border border-slate-200 p-4 rounded-lg">
                            <h3 className="font-semibold text-slate-800 mb-3">Departamentos</h3>
                            <div className="max-h-32 overflow-y-auto space-y-2 p-1">
                               <CatalogSection title="Departamentos" items={allDepartamentos} selectedItems={formData.Departamentos} onSelect={(item: any) => handleMultiSelectChange(item, 'Departamentos')} keyField="DepartamentoId" labelField="Nombre" loading={catalogsLoading} error={catalogsError} />
                            </div>
                        </div>
                        <div className="border border-slate-200 p-4 rounded-lg">
                            <h3 className="font-semibold text-slate-800 mb-3">Grupos de Nómina</h3>
                            <div className="max-h-32 overflow-y-auto space-y-2 p-1">
                                 <CatalogSection title="Grupos de Nómina" items={allGruposNomina} selectedItems={formData.GruposNomina} onSelect={(item: any) => handleMultiSelectChange(item, 'GruposNomina')} keyField="GrupoNominaId" labelField="Nombre" loading={catalogsLoading} error={catalogsError} />
                            </div>
                        </div>
                    </div>
                    
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

