// src/features/auth/ForcePasswordChangeModal.tsx
import { API_BASE_URL } from '../../config/api.ts';
import React, { useState } from 'react';
import { useAuth } from './AuthContext.tsx';
import { User } from '../../types/index.ts';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { EyeIcon, EyeOffIcon, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForcePasswordChangeModal = ({ user }: { user: User }) => {
    const { getToken, updateUserPreferences } = useAuth();
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '', error: '' });
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value, error: '' }));
    };

    const handleSaveChanges = async () => {
        const { newPassword, confirmPassword } = passwordData;

        if (newPassword !== confirmPassword) {
            setPasswordData(prev => ({ ...prev, error: 'Las contraseñas no coinciden.' }));
            return;
        }
        if (newPassword.length < 6) {
            setPasswordData(prev => ({ ...prev, error: 'La contraseña debe tener al menos 6 caracteres.' }));
            return;
        }

        const token = getToken();
        if (!token) {
            setPasswordData(prev => ({...prev, error: 'Sesión inválida.'}));
            return;
        }

        setSaveStatus('loading');
        try {
            const response = await fetch(`${API_BASE_URL}/users/${user.UsuarioId}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ password: newPassword }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al actualizar la contraseña.');
            }

            setSaveStatus('success');
            // Actualiza el estado local para que la app se "desbloquee"
            updateUserPreferences({ DebeCambiarPassword: false });
        } catch (error: any) {
            console.error("Error al guardar la contraseña:", error);
            setSaveStatus('error');
            setPasswordData(prev => ({...prev, error: error.message}));
        }
    };

    const footer = (
        <div className="w-full flex justify-end">
            <Button onClick={handleSaveChanges} disabled={saveStatus === 'loading'}>
                {saveStatus === 'loading' ? 'Guardando...' : 'Actualizar Contraseña'}
            </Button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-100 flex items-center justify-center">
            <Modal isOpen={true} onClose={() => {}} title="Actualización de Contraseña Requerida" footer={footer} size="lg">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Por seguridad, es necesario que establezcas una nueva contraseña para continuar.</p>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Nueva Contraseña</label>
                        <div className="relative">
                             <input type={isPasswordVisible ? 'text' : 'password'} name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${passwordData.error ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[--theme-500]'}`}/>
                             <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                                {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Confirmar Contraseña</label>
                         <input type={isPasswordVisible ? 'text' : 'password'} name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} onPaste={e => e.preventDefault()} className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 ${passwordData.error ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[--theme-500]'}`}/>
                    </div>
                    {passwordData.error && <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle size={16} /> {passwordData.error}</p>}
                    {saveStatus === 'success' && <p className="text-sm text-green-600 flex items-center gap-2"><CheckCircle2 size={16} /> Contraseña actualizada. Redirigiendo...</p>}
                </div>
            </Modal>
        </div>
    );
};

