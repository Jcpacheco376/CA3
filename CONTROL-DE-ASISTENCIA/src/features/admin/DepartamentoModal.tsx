// src/features/admin/DepartamentoModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../../components/ui/Modal.tsx';

export const DepartamentoModal = ({ isOpen, onClose, onSave, departamento }: any) => {
    const [formData, setFormData] = useState({
        departamento: '',
        nombre: '',
        abreviatura: '',
        status: 'ALTA',
    });

    const isNew = !departamento;

    useEffect(() => {
        if (isOpen) {
            if (departamento) {
                setFormData(departamento);
            } else {
                setFormData({ departamento: '', nombre: '', abreviatura: '', status: 'ALTA' });
            }
        }
    }, [departamento, isOpen]);

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
        <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'Crear Departamento' : 'Editar Departamento'} footer={footer} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">ID del Departamento</label>
                    <input
                        type="text"
                        name="departamento"
                        value={formData.departamento}
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

