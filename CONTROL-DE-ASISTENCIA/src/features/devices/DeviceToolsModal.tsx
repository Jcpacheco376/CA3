// src/features/devices/DeviceToolsModal.tsx
import React from 'react';
import { 
    Users, 
    ScanFace, 
    Clock, 
    Trash2, 
    Settings, 
    RefreshCw,
    Server,
    MapPin,
    Wifi,
    Fingerprint,
    UserX,
    ShieldAlert,
    Eraser
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Device } from './DeviceCard';
import { useAuth } from '../auth/AuthContext';

interface DeviceToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    device: Device | null;
    onSyncUsers: (device: Device) => void;
    onSyncFaces: (device: Device) => void;
    onSyncTime: (device: Device) => void;
    onToggleDeleteLogs: (device: Device) => void;
    onDeleteFingerprints: (device: Device) => void;
    onDeleteUsers: (device: Device) => void;
    onDeleteAdmins: (device: Device) => void;
    onDeleteFaces: (device: Device) => void;
    onDeleteAll: (device: Device) => void;
    actionState: 'sync_logs' | 'sync_users' | 'test' | 'sync_time' | 'sync_faces' | 'delete_fingerprints' | 'delete_users' | 'delete_admins' | 'delete_faces' | 'delete_all' | null;
}

export const DeviceToolsModal = ({
    isOpen,
    onClose,
    device,
    onSyncUsers,
    onSyncFaces,
    onSyncTime,
    onToggleDeleteLogs,
    onDeleteFingerprints,
    onDeleteUsers,
    onDeleteAdmins,
    onDeleteFaces,
    onDeleteAll,
    actionState
}: DeviceToolsModalProps) => {
    const { can } = useAuth();
    
    if (!device) return null;

    const isBusy = actionState !== null;
    const canSyncUsers = can('dispositivos.sync_users');
    const canUpdate = can('dispositivos.manage');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Administración de Dispositivo"
            size="lg"
        >
            <div className="space-y-6">
                {/* Header de Información Contextual */}
                <div className="pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h3 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                                <Server size={18} className="text-slate-400" />
                                {device.Nombre}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-slate-500 border-l border-slate-200 pl-4">
                                <div className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    <span>{device.ZonaNombre || 'Sin Zona'}</span>
                                </div>
                                <div className="flex items-center gap-1 font-mono">
                                    <Wifi size={12} />
                                    {device.IpAddress}
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="font-medium">ID:</span> {device.DispositivoId}
                                </div>
                            </div>
                        </div>
                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${device.Activo ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {device.Activo ? 'Activo' : 'Inactivo'}
                        </div>
                    </div>
                </div>

                {/* Sección de Sincronización */}
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <RefreshCw size={14} /> Sincronización (Enviar al Dispositivo)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {canSyncUsers && (
                            <>
                                <button
                                    onClick={() => onSyncUsers(device)}
                                    disabled={isBusy || !device.Activo}
                                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-center h-full"
                                >
                                    <div className={`p-3 rounded-full mb-3 transition-colors ${actionState === 'sync_users' ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                        <Users size={24} />
                                    </div>
                                    <span className="font-medium text-slate-700 text-sm">Personal</span>
                                    <span className="text-xs text-slate-500 mt-1">Enviar empleados y huellas</span>
                                </button>

                                <button
                                    onClick={() => onSyncFaces(device)}
                                    disabled={isBusy || !device.Activo}
                                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-center h-full"
                                >
                                    <div className={`p-3 rounded-full mb-3 transition-colors ${actionState === 'sync_faces' ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                        <ScanFace size={24} />
                                    </div>
                                    <span className="font-medium text-slate-700 text-sm">Rostros</span>
                                    <span className="text-xs text-slate-500 mt-1">Actualizar biometría facial</span>
                                </button>
                            </>
                        )}

                        {canUpdate && (
                            <button
                                onClick={() => onSyncTime(device)}
                                disabled={isBusy || !device.Activo}
                                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-center h-full"
                            >
                                <div className={`p-3 rounded-full mb-3 transition-colors ${actionState === 'sync_time' ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                    <Clock size={24} />
                                </div>
                                <span className="font-medium text-slate-700 text-sm">Hora</span>
                                <span className="text-xs text-slate-500 mt-1">Sincronizar reloj con servidor</span>
                            </button>
                        )}
                    </div>
                </div>

                {canUpdate && (
                    <>
                        <div className="border-t border-slate-100"></div>

                        {/* Sección de Limpieza Selectiva */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Trash2 size={14} /> Limpieza Selectiva
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <button
                                    onClick={() => onDeleteUsers(device)}
                                    disabled={isBusy || !device.Activo}
                                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-center h-full"
                                >
                                    <div className={`p-3 rounded-full mb-3 transition-colors ${actionState === 'delete_users' ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500 group-hover:bg-rose-100 group-hover:text-rose-600'}`}>
                                        <UserX size={24} />
                                    </div>
                                    <span className="font-medium text-slate-700 text-sm">Usuarios</span>
                                    <span className="text-xs text-slate-500 mt-1">Borrar empleados</span>
                                </button>

                                <button
                                    onClick={() => onDeleteAdmins(device)}
                                    disabled={isBusy || !device.Activo}
                                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-center h-full"
                                >
                                    <div className={`p-3 rounded-full mb-3 transition-colors ${actionState === 'delete_admins' ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500 group-hover:bg-rose-100 group-hover:text-rose-600'}`}>
                                        <ShieldAlert size={24} />
                                    </div>
                                    <span className="font-medium text-slate-700 text-sm">Admins</span>
                                    <span className="text-xs text-slate-500 mt-1">Quitar privilegios</span>
                                </button>

                                <button
                                    onClick={() => onDeleteFingerprints(device)}
                                    disabled={isBusy || !device.Activo}
                                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-center h-full"
                                >
                                    <div className={`p-3 rounded-full mb-3 transition-colors ${actionState === 'delete_fingerprints' ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500 group-hover:bg-rose-100 group-hover:text-rose-600'}`}>
                                        <Fingerprint size={24} />
                                    </div>
                                    <span className="font-medium text-slate-700 text-sm">Huellas</span>
                                    <span className="text-xs text-slate-500 mt-1">Borrar todas</span>
                                </button>

                                <button
                                    onClick={() => onDeleteFaces(device)}
                                    disabled={isBusy || !device.Activo}
                                    className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-300 hover:bg-rose-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-center h-full"
                                >
                                    <div className={`p-3 rounded-full mb-3 transition-colors ${actionState === 'delete_faces' ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500 group-hover:bg-rose-100 group-hover:text-rose-600'}`}>
                                        <ScanFace size={24} />
                                    </div>
                                    <span className="font-medium text-slate-700 text-sm">Rostros</span>
                                    <span className="text-xs text-slate-500 mt-1">Borrar biometría</span>
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-slate-100"></div>

                        {/* Sección de Sistema y Mantenimiento */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Settings size={14} /> Sistema y Mantenimiento
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Auto-limpieza */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between h-full">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${device.BorrarChecadas ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>
                                            <Trash2 size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-slate-700 text-sm">Auto-limpieza</h4>
                                            <p className="text-xs text-slate-500">Borrar logs tras descarga</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onToggleDeleteLogs(device)}
                                        disabled={isBusy || !device.Activo}
                                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${
                                            device.BorrarChecadas ? 'bg-rose-500' : 'bg-slate-200'
                                        } ${isBusy || !device.Activo ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${device.BorrarChecadas ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Formatear Datos */}
                                <button
                                    onClick={() => onDeleteAll(device)}
                                    disabled={isBusy || !device.Activo}
                                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed h-full text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg transition-colors ${actionState === 'delete_all' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500 group-hover:bg-red-100 group-hover:text-red-600'}`}>
                                            <Eraser size={20} />
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-700 text-sm block">Formatear Datos</span>
                                            <span className="text-xs text-slate-500 mt-0.5 block">Eliminar TODO del dispositivo</span>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};
