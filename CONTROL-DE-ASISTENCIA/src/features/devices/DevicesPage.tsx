// src/features/devices/DevicesPage.tsx
import React, { useEffect, useState } from 'react';
import { Device, Zone } from '../../types';
import { deviceService } from '../../services/deviceService';
import {
    Wifi, WifiOff, DownloadCloud, Users,
    Plus, Edit, Settings, Clock, Plug, Activity, Camera // <--- Importamos Camera
} from 'lucide-react';

export const DevicesPage: React.FC = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados de acción
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [syncingEmployeesId, setSyncingEmployeesId] = useState<number | null>(null);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [diagnosingId, setDiagnosingId] = useState<number | null>(null);
    
    // Nuevo estado para la captura
    const [capturingId, setCapturingId] = useState<number | null>(null);

    // Configuración Automática
    const [autoInterval, setAutoInterval] = useState(0);
    const [showConfig, setShowConfig] = useState(false);

    // Modal de Edición
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Partial<Device>>({});

    const loadData = async () => {
        try {
            const [devs, zns] = await Promise.all([
                deviceService.getAll(),
                deviceService.getZones()
            ]);
            setDevices(devs);
            setZones(zns);
        } catch (error) {
            console.error("Error cargando datos", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        deviceService.getConfigInterval().then(setAutoInterval);
    }, []);

    // --- ACCIÓN 1: DESCARGA DE LOGS ---
    const handleDownloadLogs = async (id: number) => {
        setDownloadingId(id);
        try {
            await deviceService.downloadLogs(id);
            alert('✅ Checadas descargadas y procesadas.');
            loadData();
        } catch (e: any) {
            alert('❌ Error: ' + e.message);
        } finally {
            setDownloadingId(null);
        }
    };

    // --- ACCIÓN 2: SINCRONIZACIÓN DE EMPLEADOS ---
    const handleSyncEmployees = async (id: number) => {
        if (!confirm("⚠️ ¿Estás seguro? Esto enviará la lista de empleados activos del sistema al reloj, sobrescribiendo nombres si difieren.")) return;

        setSyncingEmployeesId(id);
        try {
            await deviceService.syncEmployees(id);
            alert('✅ Sincronización de empleados completada.');
        } catch (e: any) {
            alert('❌ Error: ' + e.message);
        } finally {
            setSyncingEmployeesId(null);
        }
    };

    // --- ACCIÓN 3: TEST DE CONEXIÓN ---
    const handleTestConnection = async (id: number) => {
        setTestingId(id);
        try {
            await deviceService.testConnection(id);
            alert('✅ ¡Conexión Exitosa! El dispositivo está en línea.');
        } catch (e: any) {
            alert('❌ Falló la conexión: ' + e.message);
        } finally {
            setTestingId(null);
        }
    };

    // --- ACCIÓN 4: DIAGNÓSTICO TÉCNICO ---
    const handleDiagnose = async (id: number) => {
        setDiagnosingId(id);
        try {
            const info = await deviceService.diagnose(id);
            alert(`📊 REPORTE TÉCNICO:\n\n` +
                  `Firmware: ${info.firmware}\n` +
                  `Plataforma: ${info.platform}\n` +
                  `Serial: ${info.serial}\n` +
                  `Hora Equipo: ${info.deviceTime}\n` +
                  `Usuarios: ${info.userCount}\n` +
                  `Estado: ${info.status}`);
        } catch (e: any) {
            alert('❌ Error: ' + e.message);
        } finally {
            setDiagnosingId(null);
        }
    };

    // --- ACCIÓN 5: CAPTURA REMOTA (NUEVO) ---
    const handleCapture = async (id: number) => {
        setCapturingId(id);
        try {
            // Asumimos que agregaste captureImage a tu deviceService del frontend
            const result = await deviceService.captureImage(id);
            if (result.success) {
                // Abrir la imagen en una pestaña nueva
                window.open('http://localhost:3000' + result.url, '_blank');
            } else {
                alert('❌ No se pudo tomar la foto. El equipo podría no soportarlo.');
            }
        } catch (e: any) {
            alert('❌ Error: ' + e.message);
        } finally {
            setCapturingId(null);
        }
    };

    const handleSaveDevice = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingDevice.DispositivoId) {
                await deviceService.update(editingDevice.DispositivoId, editingDevice);
            } else {
                await deviceService.create(editingDevice);
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            alert('Error al guardar dispositivo');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header y Configuración */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Control de Checadores</h1>
                    <p className="text-slate-500">Gestión de dispositivos biométricos ZKTeco</p>
                </div>

                <div className="flex gap-3">
                    {/* Botón de Configuración Automática */}
                    <div className="relative">
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${autoInterval > 0
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {autoInterval > 0 ? <Clock size={18} className="animate-pulse" /> : <Settings size={18} />}
                            <span className="font-medium">
                                {autoInterval > 0 ? `Auto: ${autoInterval} min` : 'Automático: OFF'}
                            </span>
                        </button>

                        {showConfig && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-100 p-4 z-10">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Intervalo de Descarga</h4>
                                <select
                                    className="w-full border rounded p-2 mb-2 text-sm"
                                    value={autoInterval}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setAutoInterval(val);
                                        deviceService.setConfigInterval(val);
                                    }}
                                >
                                    <option value="0">⏹️ Apagado (Manual)</option>
                                    <option value="5">⏱️ Cada 5 minutos</option>
                                    <option value="15">⏱️ Cada 15 minutos</option>
                                    <option value="30">⏱️ Cada 30 minutos</option>
                                    <option value="60">⏱️ Cada 1 hora</option>
                                </select>
                                <p className="text-xs text-slate-400">
                                    Controla la descarga automática de registros. 0 detiene el servicio.
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => { setEditingDevice({}); setIsModalOpen(true); }}
                        className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all"
                    >
                        <Plus size={18} /> <span className="hidden sm:inline">Nuevo Dispositivo</span>
                    </button>
                </div>
            </div>

            {/* Grid de Dispositivos */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {devices.map(dev => (
                    <div key={dev.DispositivoId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                        {/* Cabecera de Tarjeta */}
                        <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${dev.Estado === 'Conectado'
                                    ? 'bg-green-100 text-green-600'
                                    : dev.Estado === 'Error' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                    {dev.Estado === 'Conectado' ? <Wifi size={24} /> : <WifiOff size={24} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{dev.Nombre}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                            {dev.IpAddress}:{dev.Puerto}
                                        </span>
                                        <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                            {dev.TipoConexion}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => { setEditingDevice(dev); setIsModalOpen(true); }}
                                className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition-colors"
                            >
                                <Edit size={18} />
                            </button>
                        </div>

                        {/* Cuerpo de Tarjeta */}
                        <div className="p-5">
                            <div className="flex justify-between items-center text-sm mb-4">
                                <span className="text-slate-500">Zona:</span>
                                <span className="font-medium text-slate-700">{dev.ZonaNombre || 'Sin Zona'}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm mb-6 bg-slate-50 p-2 rounded">
                                <span className="text-slate-500">Última Actividad:</span>
                                <span className="font-medium text-slate-800">
                                    {dev.UltimaSincronizacion
                                        ? new Date(dev.UltimaSincronizacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : '--:--'}
                                </span>
                            </div>

                            {/* Botonera de Acciones */}
                            <div className="flex flex-col gap-3">
                                {/* Fila 1: Test y Cámara */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleTestConnection(dev.DispositivoId)}
                                        disabled={testingId === dev.DispositivoId}
                                        className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${testingId === dev.DispositivoId
                                            ? 'bg-amber-50 text-amber-600 cursor-not-allowed'
                                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Plug size={18} className={testingId === dev.DispositivoId ? 'animate-pulse' : ''} />
                                        Test
                                    </button>
                                    {/* BOTÓN CÁMARA NUEVO */}
                                    <button
                                        onClick={() => handleCapture(dev.DispositivoId)}
                                        disabled={capturingId === dev.DispositivoId}
                                        className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${capturingId === dev.DispositivoId
                                            ? 'bg-purple-50 text-purple-600'
                                            : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-50'
                                            }`}
                                        title="Tomar captura remota"
                                    >
                                        <Camera size={18} className={capturingId === dev.DispositivoId ? 'animate-pulse' : ''} />
                                        {capturingId === dev.DispositivoId ? '...' : 'Foto'}
                                    </button>
                                </div>

                                {/* Diagnóstico Técnico */}
                                <button
                                    onClick={() => handleDiagnose(dev.DispositivoId)}
                                    disabled={diagnosingId === dev.DispositivoId}
                                    className={`w-full py-2 px-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium hover:bg-amber-100 flex justify-center items-center gap-2 transition-all ${diagnosingId === dev.DispositivoId ? 'opacity-75' : ''}`}
                                >
                                    <Activity size={18} className={diagnosingId === dev.DispositivoId ? 'animate-spin' : ''} />
                                    {diagnosingId === dev.DispositivoId ? 'Analizando...' : 'Diagnóstico Técnico'}
                                </button>

                                {/* Descarga y Subida */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Descargar Checadas */}
                                    <button
                                        onClick={() => handleDownloadLogs(dev.DispositivoId)}
                                        disabled={downloadingId === dev.DispositivoId}
                                        className={`py-2 px-3 rounded-lg flex flex-col items-center justify-center gap-1 text-xs font-medium transition-all ${downloadingId === dev.DispositivoId
                                            ? 'bg-slate-100 text-slate-400'
                                            : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                        }`}
                                        title="Descarga las checadas pendientes del dispositivo"
                                    >
                                        <DownloadCloud size={20} className={downloadingId === dev.DispositivoId ? 'animate-bounce' : ''} />
                                        {downloadingId === dev.DispositivoId ? 'Bajando...' : 'Descargar'}
                                    </button>

                                    {/* Subir Empleados */}
                                    <button
                                        onClick={() => handleSyncEmployees(dev.DispositivoId)}
                                        disabled={syncingEmployeesId === dev.DispositivoId}
                                        className={`py-2 px-3 rounded-lg flex flex-col items-center justify-center gap-1 text-xs font-medium transition-all ${syncingEmployeesId === dev.DispositivoId
                                            ? 'bg-slate-100 text-slate-400'
                                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                        }`}
                                        title="Envía empleados del sistema al reloj"
                                    >
                                        <Users size={20} className={syncingEmployeesId === dev.DispositivoId ? 'animate-spin' : ''} />
                                        {syncingEmployeesId === dev.DispositivoId ? 'Sincronizando...' : 'Subir Empleados'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Creación/Edición */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            {editingDevice.DispositivoId ? 'Editar' : 'Nuevo'} Dispositivo
                        </h2>
                        <form onSubmit={handleSaveDevice} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                <input
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={editingDevice.Nombre || ''}
                                    onChange={e => setEditingDevice({ ...editingDevice, Nombre: e.target.value })}
                                    placeholder="Ej. Acceso Principal"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">IP</label>
                                    <input
                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                        value={editingDevice.IpAddress || ''}
                                        onChange={e => setEditingDevice({ ...editingDevice, IpAddress: e.target.value })}
                                        placeholder="192.168.1.201"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Puerto</label>
                                    <input
                                        type="number"
                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                        value={editingDevice.Puerto || 4370}
                                        onChange={e => setEditingDevice({ ...editingDevice, Puerto: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Zona</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={editingDevice.ZonaId || ''}
                                    onChange={e => setEditingDevice({ ...editingDevice, ZonaId: parseInt(e.target.value) })}
                                    required
                                >
                                    <option value="">-- Seleccionar Zona --</option>
                                    {zones.map(z => <option key={z.ZonaId} value={z.ZonaId}>{z.Nombre}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña (CommKey)</label>
                                <input
                                    type="password"
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={editingDevice.PasswordCom || ''}
                                    onChange={e => setEditingDevice({ ...editingDevice, PasswordCom: e.target.value })}
                                    placeholder="Opcional (Ej. 123456)"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};