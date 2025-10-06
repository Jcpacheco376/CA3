// src/features/admin/GrupoNominaModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../../components/ui/Modal';

export const GrupoNominaModal = ({ isOpen, onClose, onSave, grupoNomina }: any) => {
    const [formData, setFormData] = useState({
        grupo_nomina: '',
        nombre: '',
        abreviatura: '',
        status: 'ALTA',
    });

    const isNew = !grupoNomina;

    useEffect(() => {
        if (isOpen) {
            if (grupoNomina) {
                setFormData(grupoNomina);
            } else {
                setFormData({ grupo_nomina: '', nombre: '', abreviatura: '', status: 'ALTA' });
            }
        }
    }, [grupoNomina, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const footer = (
        <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit}>Guardar</Button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'Crear Grupo de Nómina' : 'Editar Grupo de Nómina'} footer={footer} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">ID del Grupo</label>
                    <input
                        type="text"
                        name="grupo_nomina"
                        value={formData.grupo_nomina}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 border border-slate-300 rounded-md"
                        required
                        disabled={!isNew}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Nombre</label>
                    <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 border border-slate-300 rounded-md"
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
                        className="mt-1 w-full p-2 border border-slate-300 rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="mt-1 w-full p-2 border border-slate-300 rounded-md"
                    >
                        <option value="ALTA">Alta</option>
                        <option value="BAJA">Baja</option>
                    </select>
                </div>
            </form>
        </Modal>
    );
};
