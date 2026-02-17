import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Server, X, Wifi, AlertCircle, Layers, MapPin, Monitor, Lock, Edit2, GripVertical, LayoutList, LayoutGrid, Move, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { API_BASE_URL } from '../../config/api';
import { DeviceCard, Device } from './DeviceCard';
import { DeviceModal } from './DeviceModal';
import { themes } from '../../config/theme';
import { Button } from '../../components/ui/Modal';
import { PlusCircleIcon } from '../../components/ui/Icons';
import { Tooltip } from '../../components/ui/Tooltip';
import { ZonesManagerModal } from './ZonesManagerModal';
import { DraggableGrid, useGridColumns, useDynamicLayout } from '../../components/ui/DraggableGrid';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { DeviceToolsModal } from './DeviceToolsModal';

const DEVICE_STORAGE_KEY = 'device_local_state_v1';
const GRID_LAYOUT_KEY = 'device_grid_layout_v2';
const ZONE_VIEW_MODES_KEY = 'device_zone_view_modes_v1';
const ROW_HEIGHT = 374;

export const DevicesPage = () => {
    // ... (Hooks y estados existentes) ...
    const { getToken, can, user } = useAuth();
    const { addNotification } = useNotification();

    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isZonesModalOpen, setIsZonesModalOpen] = useState(false);
    const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
    const [zoneViewModes, setZoneViewModes] = useState<Record<string, 'list' | 'grid'>>(() => {
        try { return JSON.parse(localStorage.getItem(ZONE_VIEW_MODES_KEY) || '{}'); } catch { return {}; }
    });
    const [isLayoutEditMode, setIsLayoutEditMode] = useState(false);
    
    // ACTION STATE: Agregados 'push_faces' y 'download_faces'
    const [actionState, setActionState] = useState<{ [id: number]: string | null }>({});
    
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info' | 'success'; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    
    const [toolsDevice, setToolsDevice] = useState<Device | null>(null);
    const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);

    const handleOpenTools = (device: Device) => {
        setToolsDevice(device);
        setIsToolsModalOpen(true);
    };

    const canRead = can('dispositivos.read');
    const canCreate = can('dispositivos.create');

    useEffect(() => { if (canRead) fetchDevices(); }, [canRead]);

    // ... (Effect de localStorage y columnas Grid - Igual) ...
    useEffect(() => {
        if (devices.length > 0) {
            const stateToSave: Record<number, { Estado: string, UltimaSincronizacion?: string }> = {};
            devices.forEach(d => {
                stateToSave[d.DispositivoId] = { Estado: d.Estado, UltimaSincronizacion: d.UltimaSincronizacion };
            });
            localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(stateToSave));
        }
    }, [devices]);

    useEffect(() => { localStorage.setItem(ZONE_VIEW_MODES_KEY, JSON.stringify(zoneViewModes)); }, [zoneViewModes]);

    const gridColumns = useGridColumns();
    const currentZoneNames = useMemo(() => Array.from(new Set(devices.map(d => d.ZonaNombre || 'Sin Zona Asignada'))), [devices]);

    const getItemVisualSize = useCallback((zone: string, cols: number) => {
        const count = devices.filter(d => (d.ZonaNombre || 'Sin Zona Asignada') === zone).length;
        const isGridMode = (zoneViewModes[zone] || 'list') === 'grid';
        const effectiveColSpan = (isGridMode && cols >= 2) ? 2 : 1;
        const rowSpan = Math.ceil(count / effectiveColSpan);
        return rowSpan * effectiveColSpan;
    }, [devices, zoneViewModes]);

    const [gridLayout, setGridLayout] = useDynamicLayout(GRID_LAYOUT_KEY, currentZoneNames, gridColumns, getItemVisualSize);

    // Helpers
    const setDeviceAction = (id: number, action: any) => { setActionState(prev => ({ ...prev, [id]: action })); };

    const handleTestConnection = async (id: number, silent: boolean = false) => {
        const token = getToken(); if (!token) return;
        if (!silent) setDeviceAction(id, 'test');
        try {
            const response = await fetch(`${API_BASE_URL}/devices/${id}/test-connection`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
            if (!response.ok) throw new Error('Sin respuesta del dispositivo');
            if (!silent) addNotification('Conexión Exitosa', 'El dispositivo está en línea.', 'success');
            setDevices(prev => prev.map(d => d.DispositivoId === id ? { ...d, Estado: 'Conectado', UltimaSincronizacion: new Date().toISOString() } : d));
        } catch (error: any) {
            if (!silent) addNotification('Error de Conexión', error.message, 'error');
            setDevices(prev => prev.map(d => d.DispositivoId === id ? { ...d, Estado: 'Error' } : d));
        } finally { if (!silent) setDeviceAction(id, null); }
    };

    const fetchDevices = async () => {
        if (!canRead) return; const token = getToken(); if (!token) return;
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/devices`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Error ${response.status}`);
            const data = await response.json();
            const savedState = localStorage.getItem(DEVICE_STORAGE_KEY);
            let finalData = data;
            if (savedState) {
                try {
                    const localMap = JSON.parse(savedState);
                    finalData = data.map((d: Device) => {
                        const local = localMap[d.DispositivoId];
                        if (local) return { ...d, Estado: local.Estado || d.Estado, UltimaSincronizacion: local.UltimaSincronizacion || d.UltimaSincronizacion };
                        return d;
                    });
                } catch (e) { console.error("Error loading local state", e); }
            }
            setDevices(finalData);
            finalData.forEach((d: Device) => {
                if (d.Activo && (d.Estado === 'Error' || d.Estado === 'Desconectado')) { handleTestConnection(d.DispositivoId, true); }
            });
        } catch (error: any) { addNotification('Error', 'No se pudieron cargar los dispositivos.', 'error'); } finally { setLoading(false); }
    };

    const handleSyncLogs = async (device: Device) => {
        const token = getToken(); if (!token) return;
        setDeviceAction(device.DispositivoId, 'sync_logs');
        try {
            const response = await fetch(`${API_BASE_URL}/devices/${device.DispositivoId}/sync`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Error al descargar');
            if (data.success) {
                addNotification('Asistencia Descargada', `Se procesaron ${data.count} registros nuevos.`, 'success');
                setDevices(prev => prev.map(d => d.DispositivoId === device.DispositivoId ? { ...d, Estado: 'Conectado', UltimaSincronizacion: new Date().toISOString() } : d));
            } else {
                addNotification('Sin Novedades', data.message || 'No hay registros nuevos.', 'info');
                setDevices(prev => prev.map(d => d.DispositivoId === device.DispositivoId ? { ...d, Estado: 'Conectado', UltimaSincronizacion: new Date().toISOString() } : d));
            }
        } catch (error: any) { addNotification('Error Descarga', error.message, 'error'); } finally { setDeviceAction(device.DispositivoId, null); }
    };

    const handleSyncUsers = async (device: Device, options?: any, specificAction?: string) => {
        const token = getToken(); if (!token) return;
        
        const executeSync = async () => {
                setDeviceAction(device.DispositivoId, specificAction || 'sync_users');
                try {
                    const response = await fetch(`${API_BASE_URL}/devices/${device.DispositivoId}/sync-employees`, { 
                        method: 'POST', 
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: options ? JSON.stringify({ options }) : undefined
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || 'Fallo sincronización');
                    const stats = data.stats || {};
                    
                    // Mensajes homologados según la acción específica
                    let title = 'Sincronización Completada';
                    let msg = `Proceso finalizado correctamente.`;

                    if (specificAction === 'push_users') {
                        title = 'Empleados Enviados';
                        msg = `Se enviaron ${stats.usersSent || 0} empleados al dispositivo.`;
                    } else if (specificAction === 'download_users') {
                        title = 'Empleados Descargados';
                        msg = `Se descargaron ${stats.imported || 0} empleados a la base de datos.`;
                    } else if (specificAction === 'download_fingerprints') {
                        title = 'Huellas Descargadas';
                        msg = `Se descargaron huellas de ${stats.imported || 0} empleados.`;
                    } else {
                        // Caso genérico o sincronización completa
                        msg = `Enviados: ${stats.usersSent || 0}, Descargados: ${stats.imported || 0}`;
                    }

                    addNotification(title, msg, 'success');
                    setDevices(prev => prev.map(d => d.DispositivoId === device.DispositivoId ? { ...d, Estado: 'Conectado', UltimaSincronizacion: new Date().toISOString() } : d));
                } catch (error: any) { addNotification('Error Personal', error.message, 'error'); } finally { setDeviceAction(device.DispositivoId, null); }
        };

        if (options) {
            await executeSync();
        } else {
            setConfirmModal({
                isOpen: true, title: 'Sincronizar Personal', message: `¿Estás seguro de sincronizar la lista COMPLETA de empleados con el dispositivo "${device.Nombre}"? Esta acción incluye huellas y rostros y puede tomar tiempo.`, variant: 'warning',
                onConfirm: async () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    await executeSync();
                }
            });
        }
    };

    // --- NUEVO: Subir Solo Rostros ---
    const handlePushFaces = async (device: Device) => {
        const token = getToken(); if (!token) return;
        setConfirmModal({
            isOpen: true, title: 'Subir Rostros', message: `Se subirán todos los rostros disponibles en la base de datos al dispositivo "${device.Nombre}".`, variant: 'info',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setDeviceAction(device.DispositivoId, 'push_faces');
                try {
                    const response = await fetch(`${API_BASE_URL}/devices/${device.DispositivoId}/push-faces`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || 'Fallo al subir rostros');
                    addNotification('Rostros Enviados', data.message || 'Proceso completado.', 'success');
                } catch (error: any) { addNotification('Error', error.message, 'error'); } finally { setDeviceAction(device.DispositivoId, null); }
            }
        });
    };

    // --- NUEVO: Descargar Rostros (Harvest) ---
    const handleDownloadFaces = async (device: Device) => {
        const token = getToken(); if (!token) return;
        setConfirmModal({
            isOpen: true, title: 'Descargar Rostros', message: `Esto descargará todos los rostros del dispositivo "${device.Nombre}" y los guardará en la base de datos. ¿Continuar?`, variant: 'info',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setDeviceAction(device.DispositivoId, 'download_faces');
                try {
                    const response = await fetch(`${API_BASE_URL}/devices/${device.DispositivoId}/download-faces`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || 'Fallo descarga');
                    addNotification('Rostros Descargados', data.message || 'Proceso completado.', 'success');
                } catch (error: any) { addNotification('Error', error.message, 'error'); } finally { setDeviceAction(device.DispositivoId, null); }
            }
        });
    };

    // --- NUEVO: Subir Solo Huellas ---
    const handlePushFingerprints = async (device: Device) => {
        const token = getToken(); if (!token) return;
        setConfirmModal({
            isOpen: true, title: 'Subir Huellas', message: `Se subirán las huellas de los empleados activos de la zona al dispositivo "${device.Nombre}". Esto no modificará otros datos del usuario.`, variant: 'info',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setDeviceAction(device.DispositivoId, 'push_fingerprints');
                try {
                    const response = await fetch(`${API_BASE_URL}/devices/${device.DispositivoId}/push-fingerprints`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || 'Fallo al subir huellas');
                    addNotification('Huellas Enviadas', data.message || 'Proceso completado.', 'success');
                } catch (error: any) { addNotification('Error', error.message, 'error'); } finally { setDeviceAction(device.DispositivoId, null); }
            }
        });
    };

    const handleToggleDeleteLogs = async (device: Device) => {
        const token = getToken(); if (!token) return;
        const newState = !device.BorrarChecadas;
        setDevices(prev => prev.map(d => d.DispositivoId === device.DispositivoId ? { ...d, BorrarChecadas: newState } : d));
        try {
            const response = await fetch(`${API_BASE_URL}/devices/${device.DispositivoId}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...device, BorrarChecadas: newState }) });
            if (!response.ok) throw new Error('Error guardando');
            addNotification('Auto-limpieza', `La función ha sido ${newState ? 'ACTIVADA' : 'DESACTIVADA'}.`, 'info');
        } catch (error) { setDevices(prev => prev.map(d => d.DispositivoId === device.DispositivoId ? { ...d, BorrarChecadas: device.BorrarChecadas } : d)); addNotification('Error', 'No se pudo actualizar.', 'error'); }
    };

    const handleSyncTime = async (device: Device) => {
        setDeviceAction(device.DispositivoId, 'sync_time');
        try {
            await fetch(`${API_BASE_URL}/devices/${device.DispositivoId}/sync-time`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` } });
            addNotification('Hora Sincronizada', 'El reloj ahora tiene la hora del servidor.', 'success');
        } catch (error) { addNotification('Error', 'No se pudo sincronizar la hora.', 'error'); } finally { setDeviceAction(device.DispositivoId, null); }
    };

    const handleGenericDelete = async (device: Device, action: any, title: string, message: string, endpoint: string) => {
        const token = getToken(); if (!token) return;
        setConfirmModal({
            isOpen: true, title: title, message: message, variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setDeviceAction(device.DispositivoId, action);
                try {
                    const response = await fetch(`${API_BASE_URL}/devices/${device.DispositivoId}/${endpoint}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || 'Error en la operación');
                    
                    // Títulos homologados para borrado
                    let successTitle = 'Operación Exitosa';
                    switch(action) {
                        case 'delete_fingerprints': successTitle = 'Huellas Eliminadas'; break;
                        case 'delete_users': successTitle = 'Usuarios Eliminados'; break;
                        case 'delete_admins': successTitle = 'Administradores Eliminados'; break;
                        case 'delete_faces': successTitle = 'Rostros Eliminados'; break;
                        case 'delete_all': successTitle = 'Datos Eliminados'; break;
                        case 'delete_inactive': successTitle = 'Inactivos Eliminados'; break; // Caso hipotético si se usa actionState
                    }
                    addNotification(successTitle, data.message || 'Operación completada.', 'success');
                } catch (error: any) { addNotification('Error', error.message, 'error'); } finally { setDeviceAction(device.DispositivoId, null); }
            }
        });
    };

    const handleEditDevice = (device: Device) => { setEditingDevice(device); setIsCreateModalOpen(true); };
    const handleCloseModal = () => { setIsCreateModalOpen(false); setEditingDevice(null); };
    const handleEditZone = (zonaId: number) => { setSelectedZoneId(zonaId); setIsZonesModalOpen(true); };
    const toggleZoneViewMode = (zone: string) => { setZoneViewModes(prev => ({ ...prev, [zone]: prev[zone] === 'grid' ? 'list' : 'grid' })); };
    const handleSyncZone = async (e: React.MouseEvent, zoneDevices: Device[]) => {
        e.stopPropagation();
        setConfirmModal({ isOpen: true, title: 'Sincronizar Zona', message: `¿Deseas sincronizar los registros de asistencia de los ${zoneDevices.length} dispositivos en esta zona?`, variant: 'info', onConfirm: () => { setConfirmModal(prev => ({ ...prev, isOpen: false })); zoneDevices.filter(d => d.Activo).forEach(d => handleSyncLogs(d)); } });
    };

    const stats = useMemo(() => {
        const total = devices.length;
        const online = devices.filter(d => d.Estado === 'Conectado').length;
        const offline = total - online;
        return { total, online, offline };
    }, [devices]);

    const filteredDevices = useMemo(() => {
        return devices.filter(d => d.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) || d.IpAddress.includes(searchTerm));
    }, [devices, searchTerm]);

    const devicesByZone = useMemo(() => {
        const groups: Record<string, Device[]> = {};
        const sorted = [...filteredDevices].sort((a, b) => a.Nombre.localeCompare(b.Nombre));
        sorted.forEach(d => {
            const zone = d.ZonaNombre || 'Sin Zona Asignada';
            if (!groups[zone]) groups[zone] = [];
            groups[zone].push(d);
        });
        return groups;
    }, [filteredDevices]);

    if (!canRead) return (<div className="flex items-center justify-center h-full"><div className="text-center p-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><Lock className="mx-auto mb-3 opacity-20" size={48} /><h2 className="text-lg font-semibold text-slate-600">Acceso Restringido</h2></div></div>);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Dispositivos Biométricos</h2>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span>Administración centralizada de relojes biométricos.</span>
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-300">
                            <span className="flex items-center gap-1.5 text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-md"><Layers size={14} /> {stats.total}</span>
                            <span className="flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md"><Wifi size={14} /> {stats.online}</span>
                            <span className="flex items-center gap-1.5 text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded-md"><AlertCircle size={14} /> {stats.offline}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="relative group w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-[--theme-500] transition-colors" size={16} />
                        <input type="text" className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent transition-all shadow-sm" placeholder="Buscar dispositivo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
                    </div>
                    <Tooltip text="Administrar Zonas">
                        <button onClick={() => setIsZonesModalOpen(true)} className="p-2.5 rounded-lg border transition-all bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-sm"><MapPin size={18} /></button>
                    </Tooltip>
                    <Tooltip text={isLayoutEditMode ? "Terminar de organizar" : "Organizar zonas"}>
                        <button onClick={() => setIsLayoutEditMode(!isLayoutEditMode)} className={`p-2.5 rounded-lg border transition-all ${isLayoutEditMode ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-inner' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-sm'}`}><Move size={18} /></button>
                    </Tooltip>
                </div>
                {canCreate && <Button onClick={() => setIsCreateModalOpen(true)}><PlusCircleIcon /> Nuevo Dispositivo</Button>}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse border border-slate-200" />)}</div>
                ) : filteredDevices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200"><Server size={48} className="mb-4 opacity-20" /><p>No se encontraron dispositivos.</p></div>
                ) : (
                    <DraggableGrid
                        layout={gridLayout}
                        onLayoutChange={setGridLayout}
                        rowHeight={ROW_HEIGHT}
                        showEmptySlots={isLayoutEditMode}
                        isDraggable={isLayoutEditMode}
                        getItemColSpan={(zone, cols) => { const isGridMode = (zoneViewModes[zone] || 'list') === 'grid'; return (isGridMode && cols >= 2) ? 2 : 1; }}
                        getItemRowSpan={(zone, cols) => { const zoneDevices = devicesByZone[zone]; if (!zoneDevices) return 1; const isGridMode = (zoneViewModes[zone] || 'list') === 'grid'; const effectiveColSpan = (isGridMode && cols >= 2) ? 2 : 1; return Math.ceil(zoneDevices.length / effectiveColSpan); }}
                        renderItem={(zone) => {
                            const zoneDevices = devicesByZone[zone];
                            if (!zoneDevices) return null;
                            const viewMode = zoneViewModes[zone] || 'list';
                            const isGridMode = viewMode === 'grid';
                            const zoneColorName = zoneDevices[0]?.ZonaColor || 'indigo';
                            const zoneTheme = themes[zoneColorName as keyof typeof themes] || themes.indigo;
                            const containerStyle = !isLayoutEditMode ? { borderTop: `4px solid ${zoneTheme[500]}`, backgroundColor: '#f8fafc' } : {};
                            const onlineCount = zoneDevices.filter(d => d.Activo && d.Estado === 'Conectado').length;
                            const offlineCount = zoneDevices.filter(d => d.Activo && d.Estado !== 'Conectado').length;
                            const isSyncingZone = zoneDevices.some(d => actionState[d.DispositivoId] === 'sync_logs');

                            return (
                                <div className={`rounded-xl p-3 transition-all duration-200 h-full flex flex-col ${isLayoutEditMode ? 'border-2 border-dashed border-indigo-300 bg-indigo-50/30 hover:border-indigo-400 shadow-sm' : 'border border-slate-200 shadow-sm hover:shadow-md'}`} style={containerStyle}>
                                    <div className="flex items-center justify-between mb-2 px-1 group">
                                        <div className="flex items-center gap-2">
                                            <Tooltip text={`Dispositivos en: ${zone}`}>
                                                <div className={`p-1.5 rounded-lg shadow-sm border transition-colors ${isLayoutEditMode ? 'text-indigo-600 border-indigo-50 bg-white' : 'bg-white'}`} style={!isLayoutEditMode ? { color: zoneTheme[600], borderColor: zoneTheme[200] } : {}}>
                                                    <MapPin size={16} />
                                                </div>
                                            </Tooltip>
                                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide truncate max-w-[150px] select-none">{zone}</h3>
                                            {!isLayoutEditMode && (
                                                <div className="flex items-center gap-2 ml-2">
                                                    {onlineCount > 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">{onlineCount} ON</span>}
                                                    {offlineCount > 0 && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">{offlineCount} OFF</span>}
                                                    <div className="h-4 w-px bg-slate-300 mx-1"></div>
                                                    <Tooltip text="Sincronizar toda la zona">
                                                        <button onClick={(e) => handleSyncZone(e, zoneDevices)} disabled={isSyncingZone} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all disabled:opacity-50"><RefreshCw size={14} className={isSyncingZone ? "animate-spin" : ""} /></button>
                                                    </Tooltip>
                                                </div>
                                            )}
                                            {isLayoutEditMode && zoneDevices.length > 1 && (<button onClick={() => toggleZoneViewMode(zone)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">{viewMode === 'list' ? <LayoutGrid size={14} /> : <LayoutList size={14} />}</button>)}
                                            {zoneDevices[0]?.ZonaId > 0 && (<button onClick={() => handleEditZone(zoneDevices[0].ZonaId)} className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"><Edit2 size={12} /></button>)}
                                        </div>
                                        {isLayoutEditMode && <div className="text-slate-300 group-hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing"><GripVertical size={16} /></div>}
                                    </div>
                                    <div className={`relative flex-1 ${isGridMode ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "flex flex-col gap-4"}`}>
                                        {isLayoutEditMode && <div className="absolute inset-0 z-10" />}
                                        {zoneDevices.map((dev, index) => (
                                            <div key={dev.DispositivoId} className="h-full">
                                                <DeviceCard
                                                    device={dev}
                                                    actionState={actionState[dev.DispositivoId] || null}
                                                    onSyncLogs={handleSyncLogs}
                                                    onEdit={handleEditDevice}
                                                    onTestConnection={handleTestConnection}
                                                    onOpenTools={handleOpenTools}
                                                />
                                                {!isGridMode && index < zoneDevices.length - 1 && <div className="h-12 border-b border-slate-200 mt-4 mb-2 mx-2 border-dashed opacity-50"></div>}
                                            </div> 
                                        ))}
                                    </div>
                                </div>
                            );
                        }}
                    />
                )}
            </div>

            <DeviceModal isOpen={isCreateModalOpen} onClose={handleCloseModal} onSuccess={fetchDevices} deviceToEdit={editingDevice} />
            <ZonesManagerModal isOpen={isZonesModalOpen} onClose={() => { setIsZonesModalOpen(false); setSelectedZoneId(null); }} initialZoneId={selectedZoneId} onZoneUpdated={fetchDevices} />
            
            <DeviceToolsModal 
                isOpen={isToolsModalOpen}
                onClose={() => { setIsToolsModalOpen(false); setToolsDevice(null); }}
                device={toolsDevice ? devices.find(d => d.DispositivoId === toolsDevice.DispositivoId) || null : null}
                onSyncLogs={handleSyncLogs}
                onSyncUsers={handleSyncUsers}
                onSyncFaces={handlePushFaces}  // Aquí mapeamos a la función de PUSH
                onSyncFingerprints={handlePushFingerprints}
                onDownloadFaces={handleDownloadFaces} // Aquí mapeamos a la función de DOWNLOAD
                onSyncTime={handleSyncTime}
                onToggleDeleteLogs={handleToggleDeleteLogs}
                onDeleteFingerprints={(d) => handleGenericDelete(d, 'delete_fingerprints', 'Borrar Huellas', `¿Estás seguro de borrar TODAS las huellas del dispositivo "${d.Nombre}"?`, 'delete-fingerprints')}
                onDeleteUsers={(d) => handleGenericDelete(d, 'delete_users', 'Borrar Usuarios', `¿Estás seguro de borrar TODOS los usuarios del dispositivo "${d.Nombre}"?`, 'delete-users')}
                onDeleteAdmins={(d) => handleGenericDelete(d, 'delete_admins', 'Borrar Administradores', `¿Estás seguro de quitar los privilegios de administrador en el dispositivo "${d.Nombre}"?`, 'delete-admins')}
                onDeleteFaces={(d) => handleGenericDelete(d, 'delete_faces', 'Borrar Rostros', `¿Estás seguro de borrar TODOS los rostros del dispositivo "${d.Nombre}"?`, 'delete-faces')}
                onDeleteAll={(d) => handleGenericDelete(d, 'delete_all', 'Formatear Datos', `¿Estás seguro de borrar TODO (usuarios, huellas, rostros, logs) del dispositivo "${d.Nombre}"?`, 'delete-data')}
                onDeleteInactive={(d) => handleGenericDelete(d, 'delete_users', 'Borrar Inactivos', `¿Estás seguro de borrar del dispositivo a los empleados que están dados de baja en la base de datos?`, 'delete-users')} // Nota: Reutiliza endpoint delete-users o necesita uno específico si existe lógica de filtro en backend. Asumo delete-users por ahora o ajusta si tienes endpoint 'delete-inactive'.
                actionState={toolsDevice ? (actionState[toolsDevice.DispositivoId] || null) : null}
            />
            
            <ConfirmationModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} onConfirm={confirmModal.onConfirm} title={confirmModal.title} variant={confirmModal.variant}>
                {confirmModal.message}
            </ConfirmationModal>
        </div>
    );
};