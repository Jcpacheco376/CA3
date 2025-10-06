// src/features/auth/UserProfileModal.tsx
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { Zap, ZapOff, CheckCircle2, AlertCircle, Eye, EyeOff, Mail, User as UserIcon, Shield } from 'lucide-react';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { useAppContext } from '../../context/AppContext.tsx';
import { themes } from '../../config/theme.ts';
import { useAuth } from './AuthContext.tsx';
import { API_BASE_URL } from '../../config/api.ts';

// --- Componentes Internos del Modal ---

const AnimationToggle = ({ enabled, onChange }: { enabled: boolean, onChange: (enabled: boolean) => void }) => (
    <button onClick={() => onChange(!enabled)} className="p-2 rounded-full hover:bg-gray-200 text-gray-600" title={enabled ? 'Deshabilitar animaciones' : 'Habilitar animaciones'}>
        {enabled ? <ZapOff size={20} /> : <Zap size={20} />}
    </button>
);

const ThemeSwitcher = ({ currentTheme, onChange }: { currentTheme: string, onChange: (theme: string) => void }) => (
    <div className="flex items-center gap-2 flex-wrap">
        {Object.keys(themes).map(color => (
            <button key={color} onClick={() => onChange(color)} className={`w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentTheme === color ? 'ring-[--theme-500]' : 'ring-transparent'}`}
                style={{ backgroundColor: themes[color][500] }} aria-label={`Cambiar a tema ${color}`} />
        ))}
    </div>
);

const UserProfileModalContent = ({ user, preferences, setPreferences, passwordData, setPasswordData, themeColors }: any) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const avatarInitial = user?.NombreCompleto ? user.NombreCompleto.charAt(0).toUpperCase() : 'U';
    const fullName = user?.NombreCompleto || 'Usuario';
    const email = user?.Email || 'No disponible';
    const username = user?.NombreUsuario || 'No disponible';
    const roles = user?.Roles?.map((r: any) => r.NombreRol).join(', ') || 'Sin rol asignado';

    console.log("User data in modal:", user);


    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData((prev: any) => ({ ...prev, [name]: value, error: '' }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
                <img src={`https://placehold.co/80x80/${themeColors[100].substring(1)}/${themeColors[900].substring(1)}?text=${avatarInitial}`} alt="Avatar" className="w-20 h-20 rounded-full mb-3" />
                <h3 className="text-xl font-bold text-slate-800">{fullName}</h3>
                <p className="text-slate-500">{roles}</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <UserIcon size={18} className="text-slate-400 shrink-0" />
                    <span className="text-slate-600 truncate" title={username}>{username}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail size={18} className="text-slate-400 shrink-0" />
                    <span className="text-slate-600 truncate" title={email}>{email}</span>
                </div>
            </div>

            <hr />

            <div>
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Shield size={18} /> Seguridad</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-2 relative">
                        <label className="block text-sm font-medium text-slate-600">Nueva Contraseña</label>
                        <input type={isPasswordVisible ? 'text' : 'password'} name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="Mínimo 6 caracteres" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${passwordData.error ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[--theme-500]'}`}/>
                         <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute bottom-2 right-3 text-slate-400 hover:text-slate-600">
                            {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-600">Confirmar Contraseña</label>
                        <input type={isPasswordVisible ? 'text' : 'password'} name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} onPaste={(e) => e.preventDefault()} placeholder="Repetir contraseña" className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${passwordData.error ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[--theme-500]'}`}/>
                    </div>
                </div>
                {passwordData.error && <p className="text-sm text-red-600 mt-1">{passwordData.error}</p>}
            </div>

            <hr />
            
            <div>
                <h4 className="font-semibold text-slate-700 mb-3">Preferencias de Interfaz</h4>
                <div className="space-y-4">
                    <div>
                        <h5 className="text-sm font-medium text-slate-600 mb-2">Tema de Color</h5>
                        <ThemeSwitcher currentTheme={preferences.theme} onChange={(theme) => setPreferences((prev: any) => ({ ...prev, theme }))} />
                    </div>
                     <div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                            <label className="text-slate-700 font-medium">Activar animaciones</label>
                            <AnimationToggle enabled={preferences.animationsEnabled} onChange={(enabled) => setPreferences((prev: any) => ({ ...prev, animationsEnabled: enabled }))} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const UserProfileModal = ({ isOpen, onClose, user, setTheme }: any) => {
    const { updateUserPreferences, getToken } = useAuth();
    const { setAnimationsEnabled } = useAppContext();
    
    const [preferences, setPreferences] = useState({ theme: 'indigo', animationsEnabled: true });
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '', error: '' });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        if (isOpen) {
            setPreferences({ theme: user.Theme || 'indigo', animationsEnabled: user.AnimationsEnabled ?? true });
            setPasswordData({ newPassword: '', confirmPassword: '', error: '' });
            setSaveStatus('idle');
        }
    }, [user, isOpen]);

    const handleSaveChanges = async () => {
        if (!user) return;
        const token = getToken();
        if (!token) return;

        const { newPassword, confirmPassword } = passwordData;

        if (newPassword && newPassword !== confirmPassword) {
            setPasswordData(prev => ({ ...prev, error: 'Las contraseñas no coinciden.' }));
            return;
        }
        if (newPassword && newPassword.length < 6) {
            setPasswordData(prev => ({ ...prev, error: 'La contraseña debe tener al menos 6 caracteres.' }));
            return;
        }

        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        
        try {
            const prefPromise = fetch(`${API_BASE_URL}/api/users/${user.UsuarioId}/preferences`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ theme: preferences.theme, animationsEnabled: preferences.animationsEnabled }),
            });

            const passPromise = newPassword ? fetch(`${API_BASE_URL}/api/users/${user.UsuarioId}/password`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ password: newPassword }),
            }) : Promise.resolve();
            
            await Promise.all([prefPromise, passPromise]);

            updateUserPreferences({
                Theme: preferences.theme,
                AnimationsEnabled: preferences.animationsEnabled,
            });
            setTheme(preferences.theme);
            setAnimationsEnabled(preferences.animationsEnabled);
            
            setSaveStatus('success');
            onClose();
            //setTimeout(() => { onClose(); }, 1500);

        } catch (error) {
            console.error("Error al guardar cambios:", error);
            setSaveStatus('error');
        }
    };
    
    const previewThemeColors = themes[preferences.theme] || themes.indigo;

    const footer = (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 h-5">
                {saveStatus === 'success' && <CheckCircle2 size={20} className="text-green-500" />}
                {saveStatus === 'success' && <span className="text-sm text-green-600">Cambios guardados</span>}
                {saveStatus === 'error' && <AlertCircle size={20} className="text-red-500" />}
                {saveStatus === 'error' && <span className="text-sm text-red-600">Error al guardar</span>}
            </div>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose} disabled={saveStatus === 'success'}>Cancelar</Button>
                <Button onClick={handleSaveChanges} style={{ background: `linear-gradient(to bottom right, ${previewThemeColors[500]}, ${previewThemeColors[600]})`}} disabled={saveStatus === 'success'}>
                    Guardar Cambios
                </Button>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Perfil y Configuración" footer={footer} size="xl">
            <UserProfileModalContent 
                user={user} 
                preferences={preferences}
                setPreferences={setPreferences}
                passwordData={passwordData}
                setPasswordData={setPasswordData}
                themeColors={previewThemeColors}
            />
        </Modal>
    );
};

