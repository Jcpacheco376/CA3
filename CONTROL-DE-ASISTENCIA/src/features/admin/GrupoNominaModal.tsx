// src/features/admin/GrupoNominaModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { API_BASE_URL } from '../../config/api.ts';
import { Loader2 } from 'lucide-react';
import { themes } from '../../config/theme.ts';

// Componente ToggleSwitch que ahora acepta el color del tema
const ToggleSwitch = ({ checked, onChange, themeColor }: { checked: boolean, onChange: (checked: boolean) => void, themeColor: string }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
            style={{ 
                backgroundColor: checked ? themeColor : '#E5E7EB', // gray-200
            }}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    );
};

export const GrupoNominaModal = ({ isOpen, onClose, onSave, grupoNomina }: any) => {
    const { getToken, user } = useAuth();
    const { addNotification } = useNotification();
    const [formData, setFormData] = useState({
        GrupoNominaid: '',
        CodRef: '',
        Nombre: '',
        Abreviatura: '',
        Activo: 1,
    });
    const [isSaving, setIsSaving] = useState(false);

    const isNew = !grupoNomina;
    const theme = themes[user?.Theme as keyof typeof themes] || themes.indigo;

    useEffect(() => {
        if (isOpen) {
            if (grupoNomina) {
                setFormData({
                    GrupoNominaid: grupoNomina.GrupoNominaId || '',
                    CodRef: grupoNomina.CodRef || '',
                    Nombre: grupoNomina.Nombre || '',
                    Abreviatura: grupoNomina.Abreviatura || '',
                    Activo: grupoNomina.Activo || 1,
                });
            } else {
                setFormData({
                    GrupoNominaid: '',
                    Nombre: '',
                    CodRef: '',
                    Abreviatura: '',
                    Activo: 1,
                });
            }
        }
    }, [grupoNomina, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = (isActive: boolean) => {
        setFormData(prev => ({ ...prev, Activo: isActive ? 1 : 0 }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const token = getToken();
        if (!token) {
            addNotification("Error", "Su sesión ha expirado.", "error");
            setIsSaving(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}api/catalogs/grupos-nomina`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar el grupo de nómina.');
            }

            addNotification("Éxito", "Grupo de nómina guardado correctamente.", "success");
            onSave();
        } catch (err: any) {
            addNotification("Error", err.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    const footer = (
        <>
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
            </Button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'Crear Grupo de Nómina' : 'Editar Grupo de Nómina'} footer={footer} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-4">
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-slate-700">ID del Grupo</label>
                        <input
                            type="text"
                            name="GrupoNominaid"
                            value={formData.GrupoNominaid}
                            onChange={handleChange}
                            className="mt-1 w-full p-2 border border-slate-300 rounded-md disabled:bg-slate-100"
                            required
                            disabled={!isNew}
                        />
                    </div>
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-slate-700">Referencia</label>
                        <input
                            type="text"
                            name="CodRef"
                            value={formData.CodRef}
                            onChange={handleChange}
                            className="mt-1 w-full p-2 border border-slate-300 rounded-md"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Nombre</label>
                    <input
                        type="text"
                        name="Nombre"
                        value={formData.Nombre}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 border border-slate-300 rounded-md"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Abreviatura</label>
                    <input
                        type="text"
                        name="Abreviatura"
                        value={formData.Abreviatura}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 border border-slate-300 rounded-md"
                    />
                </div>
                <div className="flex items-center gap-4 pt-2">       
                    <ToggleSwitch
                        checked={formData.Activo == 1}
                        onChange={handleStatusChange}
                        themeColor={theme[600]}
                    />
                    <label className="block text-sm font-medium text-slate-700">Activo</label>
                </div>
            </form>
        </Modal>
    );
};

