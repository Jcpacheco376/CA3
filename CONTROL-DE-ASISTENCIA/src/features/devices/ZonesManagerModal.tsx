import React, { useState, useEffect } from 'react';
import { MapPin, Trash2, Edit2, Save, X, Plus, AlertCircle, Power } from 'lucide-react';
import { Modal, Button } from '../../components/ui/Modal';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Tooltip } from '../../components/ui/Tooltip';
import { statusColorPalette } from '../../config/theme';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

interface Zone {
    ZonaId: number;
    Nombre: string;
    Descripcion?: string;
    ColorUI?: string;
    DispositivosCount?: number; // Necesitamos que el backend nos diga cuántos tiene
    Activo: boolean;
}

export const ZonesManagerModal = ({ isOpen, onClose, initialZoneId, onZoneUpdated }: { isOpen: boolean; onClose: () => void; initialZoneId?: number | null; onZoneUpdated?: () => void }) => {
    const { getToken } = useAuth();
    const { addNotification } = useNotification();
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('indigo'); // Default nombre de color
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('indigo');
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info' | 'success';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    useEffect(() => {
        if (isOpen) {
            fetchZones().then((data) => {
                // Si nos pasan un ID inicial, activamos el modo edición para esa zona
                if (initialZoneId && data) {
                    const target = data.find((z: Zone) => z.ZonaId === initialZoneId);
                    if (target) {
                        setEditingId(target.ZonaId);
                        setEditName(target.Nombre);
                        setEditColor(target.ColorUI || 'indigo');
                    }
                }
            });
        } else {
            setEditingId(null);
            setEditName('');
            setEditColor('indigo');
        }
    }, [isOpen, initialZoneId]);

    const fetchZones = async () => {
        setLoading(true);
        try {
            // Asumimos que el endpoint GET /devices/zones ahora devuelve también el count de dispositivos
            // Si no, habría que ajustar el backend. Por ahora lo simulamos o confiamos en la integridad referencial.
            const response = await fetch(`${API_BASE_URL}/devices/zones?includeCount=true`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (response.ok) {
                const data = await response.json();
                setZones(data);
                return data;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
        return null;
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/devices/zones`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ Nombre: newName, ColorUI: newColor })
            });
            if (res.ok) {
                addNotification('Éxito', 'Zona creada', 'success');
                setNewName('');
                setNewColor('indigo');
                setIsCreating(false);
                fetchZones();
                onZoneUpdated?.();
            }
        } catch (e) { addNotification('Error', 'No se pudo crear', 'error'); }
    };

    const handleUpdate = async (id: number) => {
        if (!editName.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/devices/zones/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ Nombre: editName, ColorUI: editColor })
            });
            if (res.ok) {
                addNotification('Éxito', 'Zona actualizada', 'success');
                setEditingId(null);
                fetchZones();
                onZoneUpdated?.();
            }
        } catch (e) { addNotification('Error', 'No se pudo actualizar', 'error'); }
    };

    const handleDelete = async (z: Zone) => {
        if ((z.DispositivosCount || 0) > 0) {
            addNotification('Aviso', 'No se puede eliminar una zona con dispositivos activos.', 'warning');
            return;
        }
        
        setConfirmModal({
            isOpen: true,
            title: 'Desactivar Zona',
            message: `¿Estás seguro de que deseas desactivar la zona "${z.Nombre}"?`,
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const res = await fetch(`${API_BASE_URL}/devices/zones/${z.ZonaId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${getToken()}` }
                    });
                    if (res.ok) {
                        addNotification('Éxito', 'Zona desactivada', 'success');
                        fetchZones();
                        onZoneUpdated?.();
                    }
                } catch (e) { addNotification('Error', 'No se pudo eliminar', 'error'); }
            }
        });
    };

    const handleReactivate = async (z: Zone) => {
        try {
            const res = await fetch(`${API_BASE_URL}/devices/zones/${z.ZonaId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ Nombre: z.Nombre, ColorUI: z.ColorUI, Activo: true })
            });
            if (res.ok) {
                addNotification('Éxito', 'Zona reactivada', 'success');
                fetchZones();
                onZoneUpdated?.();
            }
        } catch (e) { addNotification('Error', 'No se pudo reactivar', 'error'); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Administrar Zonas" size="md">
            <div className="space-y-4">
                
                {/* Crear Nueva */}
                {isCreating ? (
                    <div className="flex flex-col gap-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-1.5 items-center">
                            <input 
                                autoFocus
                                className="flex-1 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                placeholder="Nombre de la zona..."
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                            <Button size="sm" onClick={handleCreate}>Guardar</Button>
                            <button onClick={() => setIsCreating(false)} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={18}/></button>
                        </div>
                        
                        {/* Selector de Color */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {Object.keys(statusColorPalette).map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setNewColor(color)}
                                    className={`w-6 h-6 rounded-full transition-all ${
                                        newColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'
                                    } ${statusColorPalette[color].main}`}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <Button variant="secondary" className="w-full border-dashed border-2" onClick={() => setIsCreating(true)}>
                        <Plus size={16} className="mr-2"/> Nueva Zona
                    </Button>
                )}

                {/* Lista */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {loading ? <div className="text-center p-4 text-slate-400">Cargando...</div> : zones.map(z => (
                        <div key={z.ZonaId} className={`flex items-center justify-between p-3 border rounded-lg transition-colors group ${
                            z.Activo ? 'bg-white border-slate-100 hover:border-slate-200' : 'bg-slate-50 border-slate-200 opacity-75'
                        }`}>
                            {editingId === z.ZonaId ? (
                                <div className="flex flex-col gap-1.5 flex-1 mr-2">
                                    <div className="flex gap-1.5 items-center">
                                        <input 
                                            className="flex-1 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            autoFocus
                                        />
                                        <button onClick={() => handleUpdate(z.ZonaId)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={18}/></button>
                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded"><X size={18}/></button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.keys(statusColorPalette).map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setEditColor(color)}
                                                className={`w-5 h-5 rounded-full transition-all ${
                                                    editColor === color ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : 'hover:scale-110 opacity-60 hover:opacity-100'
                                                } ${statusColorPalette[color].main}`}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-md text-white shadow-sm ${z.Activo ? (statusColorPalette[z.ColorUI || 'indigo']?.main || 'bg-indigo-500') : 'bg-slate-400'}`}>
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${z.Activo ? 'text-slate-700' : 'text-slate-500'}`}>{z.Nombre}</p>
                                        {z.Activo ? (
                                            <p className="text-xs text-slate-400">{z.DispositivosCount || 0} dispositivos</p>
                                        ) : (
                                            <span className="inline-flex mt-0.5 items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-500">Inactiva</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {editingId !== z.ZonaId && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {z.Activo && (
                                        <button 
                                            onClick={() => { setEditingId(z.ZonaId); setEditName(z.Nombre); setEditColor(z.ColorUI || 'indigo'); }}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    
                                    {z.Activo ? (
                                        (z.DispositivosCount || 0) === 0 ? (
                                            <button 
                                                onClick={() => handleDelete(z)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        ) : (
                                            <Tooltip text="No se puede eliminar: tiene dispositivos asignados">
                                                <div className="p-1.5 text-slate-200 cursor-not-allowed">
                                                    <Trash2 size={16} />
                                                </div>
                                            </Tooltip>
                                        )
                                    ) : (
                                        <Tooltip text="Reactivar zona">
                                            <button 
                                                onClick={() => handleReactivate(z)}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                            ><Power size={16} /></button>
                                        </Tooltip>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                variant={confirmModal.variant}
            >
                {confirmModal.message}
            </ConfirmationModal>
        </Modal>
    );
};