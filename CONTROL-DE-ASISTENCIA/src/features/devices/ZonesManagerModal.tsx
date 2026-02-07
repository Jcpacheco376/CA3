import React, { useState, useEffect } from 'react';
import { MapPin, Trash2, Edit2, Save, X, Plus, AlertCircle } from 'lucide-react';
import { Modal, Button } from '../../components/ui/Modal';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Tooltip } from '../../components/ui/Tooltip';

interface Zone {
    ZonaId: number;
    Nombre: string;
    Descripcion?: string;
    DispositivosCount?: number; // Necesitamos que el backend nos diga cuántos tiene
}

export const ZonesManagerModal = ({ isOpen, onClose, initialZoneId }: { isOpen: boolean; onClose: () => void; initialZoneId?: number | null }) => {
    const { getToken } = useAuth();
    const { addNotification } = useNotification();
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchZones().then((data) => {
                // Si nos pasan un ID inicial, activamos el modo edición para esa zona
                if (initialZoneId && data) {
                    const target = data.find((z: Zone) => z.ZonaId === initialZoneId);
                    if (target) {
                        setEditingId(target.ZonaId);
                        setEditName(target.Nombre);
                    }
                }
            });
        } else {
            setEditingId(null);
            setEditName('');
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
                body: JSON.stringify({ Nombre: newName })
            });
            if (res.ok) {
                addNotification('Éxito', 'Zona creada', 'success');
                setNewName('');
                setIsCreating(false);
                fetchZones();
            }
        } catch (e) { addNotification('Error', 'No se pudo crear', 'error'); }
    };

    const handleUpdate = async (id: number) => {
        if (!editName.trim()) return;
        try {
            const res = await fetch(`${API_BASE_URL}/devices/zones/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ Nombre: editName })
            });
            if (res.ok) {
                addNotification('Éxito', 'Zona actualizada', 'success');
                setEditingId(null);
                fetchZones();
            }
        } catch (e) { addNotification('Error', 'No se pudo actualizar', 'error'); }
    };

    const handleDelete = async (z: Zone) => {
        if ((z.DispositivosCount || 0) > 0) {
            addNotification('Aviso', 'No se puede eliminar una zona con dispositivos activos.', 'warning');
            return;
        }
        if (!window.confirm('¿Desactivar esta zona?')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/devices/zones/${z.ZonaId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                addNotification('Éxito', 'Zona desactivada', 'success');
                fetchZones();
            }
        } catch (e) { addNotification('Error', 'No se pudo eliminar', 'error'); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Administrar Zonas" size="md">
            <div className="space-y-4">
                
                {/* Crear Nueva */}
                {isCreating ? (
                    <div className="flex gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <input 
                            autoFocus
                            className="flex-1 px-3 py-2 border rounded text-sm"
                            placeholder="Nombre de la zona..."
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                        <Button size="sm" onClick={handleCreate}>Guardar</Button>
                        <button onClick={() => setIsCreating(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={18}/></button>
                    </div>
                ) : (
                    <Button variant="secondary" className="w-full border-dashed border-2" onClick={() => setIsCreating(true)}>
                        <Plus size={16} className="mr-2"/> Nueva Zona
                    </Button>
                )}

                {/* Lista */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {loading ? <div className="text-center p-4 text-slate-400">Cargando...</div> : zones.map(z => (
                        <div key={z.ZonaId} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-colors group">
                            {editingId === z.ZonaId ? (
                                <div className="flex gap-2 flex-1 mr-2">
                                    <input 
                                        className="flex-1 px-2 py-1 border rounded text-sm"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                    />
                                    <button onClick={() => handleUpdate(z.ZonaId)} className="text-emerald-600"><Save size={18}/></button>
                                    <button onClick={() => setEditingId(null)} className="text-slate-400"><X size={18}/></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-50 rounded-md text-indigo-500">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">{z.Nombre}</p>
                                        <p className="text-xs text-slate-400">{z.DispositivosCount || 0} dispositivos</p>
                                    </div>
                                </div>
                            )}

                            {editingId !== z.ZonaId && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => { setEditingId(z.ZonaId); setEditName(z.Nombre); }}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    
                                    {(z.DispositivosCount || 0) === 0 ? (
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
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};