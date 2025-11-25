// src/features/admin/DepartamentoModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { useAuth } from '../../features/auth/AuthContext.tsx';
import { themes } from '../../config/theme.ts';
import { Loader2 } from 'lucide-react';

const ToggleSwitch = ({ checked, onChange, themeColor }: { checked: boolean, onChange: (checked: boolean) => void, themeColor: string }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
           className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
             style={{ 
                backgroundColor: checked ? themeColor : '#E5E7EB', // Tailwind's gray-200
            }}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    );
};

export const DepartamentoModal = ({ isOpen, onClose, onSave, departamento }: any) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        DepartamentoId: '',
        CodRef: '',
        nombre: '',
        abreviatura: '',
        Activo: 1,
    });
    const [isSaving, setIsSaving] = useState(false); // Aunque el guardado es en el padre, podemos usar esto para feedback

    const isNew = !departamento;
    const theme = themes[user?.Theme as keyof typeof themes] || themes.indigo;

    useEffect(() => {
        if (isOpen) {
            if (departamento) {
                // Mapeo correcto desde el objeto que viene de la tabla
                setFormData({
                    DepartamentoId: departamento.DepartamentoId || '',
                    CodRef: departamento.CodRef || '',
                    nombre: departamento.Nombre || '',
                    abreviatura: departamento.Abreviatura || '',
                    Activo: departamento.Activo || 1,
                });
            } else {
                // Estado inicial para un nuevo departamento
                setFormData({
                    DepartamentoId: '',
                    CodRef: '',
                    nombre: '',
                    abreviatura: '',
                    Activo: 1,
                });
            }
        }
    }, [departamento, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = (isActive: boolean) => {
        setFormData(prev => ({ ...prev, Activo: isActive ? 1 : 0 }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // La lógica de guardado (fetch) está en el componente padre, 
        // aquí solo pasamos los datos formateados.
        onSave(formData);
        // Podríamos querer que el padre nos notifique cuando termine de guardar
        // pero por ahora, asumimos que se cierra.
        setIsSaving(false);
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
        <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'Crear Departamento' : 'Editar Departamento'} footer={footer} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-4">
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-slate-700">ID del Departamento</label>
                        <input
                            type="text"
                            name="DepartamentoId"
                            value={formData.DepartamentoId}
                            onChange={handleChange}
                            // --- MODIFICACIÓN AQUÍ ---
                            className="mt-1 w-full p-2 border border-slate-300 rounded-md disabled:bg-slate-100 focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]"
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
                            // --- MODIFICACIÓN AQUÍ ---
                            className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Nombre</label>
                    <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        // --- MODIFICACIÓN AQUÍ ---
                        className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Abreviatura</label>
                    <input
                        type="text"
                        name="abreviatura"
                        value={formData.abreviatura}
                        onChange={handleChange}
                        // --- MODIFICACIÓN AQUÍ ---
                        className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]"
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