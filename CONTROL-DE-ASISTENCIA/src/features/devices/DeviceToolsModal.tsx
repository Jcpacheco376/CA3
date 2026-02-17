//src/features/devices/DeviceToolsModal.tsx
import React, { useState } from 'react';
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
    Eraser,
    Download,
    CheckSquare,
    Square,
    UserMinus,
    Upload,
    ArrowUpCircle,
    ArrowDownCircle,
    FileDigit,
    DownloadCloud
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Device } from './DeviceCard';
import { useAuth } from '../auth/AuthContext';
import { Tooltip } from '../../components/ui/Tooltip';

export interface SyncOptions {
    syncUsers: boolean; // Obligatorio internamente, no mostrado u mostrado disabled
    syncFingerprints: boolean;
    syncFaces: boolean;
    deleteInactive: boolean;
    syncTime: boolean;
    harvestUsers: boolean; // Implícito en Sync completa? El usuario dijo "se hace su proceso de bajar, luego subir".
}

interface DeviceToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    device: Device | null;
    onSyncLogs: (device: Device) => void;
    onSyncUsers: (device: Device, options?: Partial<SyncOptions>, specificAction?: string) => void;
    onSyncFaces: (device: Device) => void;
    onSyncFingerprints: (device: Device) => void;
    onDownloadFaces: (device: Device) => void;
    onSyncTime: (device: Device) => void;
    onToggleDeleteLogs: (device: Device) => void;
    onDeleteFingerprints: (device: Device) => void;
    onDeleteUsers: (device: Device) => void;
    onDeleteAdmins: (device: Device) => void;
    onDeleteFaces: (device: Device) => void;
    onDeleteAll: (device: Device) => void;
    onDeleteInactive: (device: Device) => void;
    actionState: string | null;
}

export const DeviceToolsModal = ({
    isOpen,
    onClose,
    device,
    onSyncLogs,
    onSyncUsers,
    onSyncFaces,
    onSyncFingerprints,
    onDownloadFaces,
    onSyncTime,
    onToggleDeleteLogs,
    onDeleteFingerprints,
    onDeleteUsers,
    onDeleteAdmins,
    onDeleteFaces,
    onDeleteAll,
    onDeleteInactive,
    actionState
}: DeviceToolsModalProps) => {
    const { can } = useAuth();
    
    // Configuración por defecto para el botón MAESTRO
    const [options, setOptions] = useState<SyncOptions>({
        syncUsers: true,        // Siempre true
        syncFingerprints: true,
        syncFaces: true,
        deleteInactive: false,
        syncTime: true,
        harvestUsers: true      // Siempre true para no perder datos
    });

    if (!device) return null;

    const isBusy = actionState !== null;
    const canSyncUsers = can('dispositivos.sync_users');
    const canUpdate = can('dispositivos.manage');

    const toggleOption = (key: keyof SyncOptions) => {
        if (key === 'syncUsers' || key === 'harvestUsers') return; // Bloqueados
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const OptionCheckbox = ({ label, optionKey, disabled = false, tooltip }: { label: string, optionKey: keyof SyncOptions, disabled?: boolean, tooltip?: string }) => {
        const content = (
            <button 
                onClick={() => !isBusy && !disabled && toggleOption(optionKey)}
                className={`flex items-center gap-2 text-sm transition-colors focus:outline-none ${options[optionKey] ? 'text-slate-700 font-medium' : 'text-slate-400'} ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer hover:text-indigo-600'}`}
            >
                {options[optionKey] ? 
                    <CheckSquare size={18} className={disabled ? "text-slate-400" : "text-indigo-600"} /> : 
                    <Square size={18} className="text-slate-300" />
                }
                <span>{label}</span>
            </button>
        );
        return tooltip ? <Tooltip text={tooltip}>{content}</Tooltip> : content;
    };

    const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 mt-6">
            <div className="p-1.5 bg-slate-50 text-slate-500 rounded-md">
                <Icon size={16} />
            </div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
        </div>
    );

    const ToolButton = ({ onClick, icon: Icon, label, color = "slate", disabled = false, loading = false, tooltip, isActive = false }: any) => {
        const colors: any = {
            slate: "hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 text-slate-600",
            indigo: "hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600",
            rose: "hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 text-slate-600",
            emerald: "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600",
            blue: "hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-slate-600",
            orange: "hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 text-slate-600",
            red: "hover:border-red-300 hover:bg-red-50 hover:text-red-700 text-slate-600"
        };
        
        const activeColors: any = {
            slate: "border-slate-300 bg-slate-100 text-slate-800",
            indigo: "border-indigo-300 bg-indigo-50 text-indigo-700",
            rose: "border-rose-300 bg-rose-50 text-rose-700",
            emerald: "border-emerald-300 bg-emerald-50 text-emerald-700",
            blue: "border-blue-300 bg-blue-50 text-blue-700",
            orange: "border-orange-300 bg-orange-50 text-orange-700",
            red: "border-red-300 bg-red-50 text-red-700"
        };

        const finalClass = isActive ? activeColors[color] : colors[color];

        const button = (
            <button
                onClick={onClick}
                disabled={disabled || isBusy}
                className={`
                    flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 
                    transition-all duration-200 h-24 w-full
                    ${finalClass} 
                    ${(disabled || isBusy) ? 'opacity-50 cursor-not-allowed grayscale' : 'shadow-sm hover:shadow-md'}
                `}
            >
                <div className={`mb-2 ${loading ? 'animate-spin' : ''}`}>
                    {loading ? <RefreshCw size={24} /> : <Icon size={24} />}
                </div>
                <span className="text-xs font-semibold text-center leading-tight">{label}</span>
            </button>
        );

        return tooltip ? <Tooltip text={tooltip}>{button}</Tooltip> : button;
    };

    const ToggleToolButton = ({ onClick, icon: Icon, label, disabled = false, tooltip, isActive = false }: any) => {
        const activeClass = isActive 
            ? "bg-rose-50 border-rose-200 text-rose-700" 
            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300";

        const button = (
            <button
                onClick={onClick}
                disabled={disabled || isBusy}
                className={`
                    relative flex flex-col items-center justify-between p-3 rounded-lg border 
                    transition-all duration-200 h-24 w-full
                    ${activeClass}
                    ${(disabled || isBusy) ? 'opacity-50 cursor-not-allowed grayscale' : 'shadow-sm hover:shadow-md'}
                `}
            >
                <div className="w-full flex justify-between items-start">
                    <div className={`p-1.5 rounded-full ${isActive ? 'bg-rose-100' : 'bg-slate-100'}`}>
                        <Icon size={20} />
                    </div>
                    <div className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${isActive ? 'bg-rose-500' : 'bg-slate-300'}`}>
                        <span className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                </div>
                <span className="text-xs font-semibold text-center leading-tight w-full mt-1">{label}</span>
            </button>
        );
        return tooltip ? <Tooltip text={tooltip}>{button}</Tooltip> : button;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Administración: ${device.Nombre}`}
            size="lg"
        >
            <div className="space-y-2">
                
                {/* HEADER CONTEXTUAL */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-sm mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                            <Wifi size={14} />
                            <span className="font-mono">{device.IpAddress}</span>
                        </div>
                        <div className="w-px h-4 bg-slate-300"></div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                            <MapPin size={14} />
                            <span>{device.ZonaNombre || 'Sin Zona'}</span>
                        </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${device.Activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {device.Activo ? 'ACTIVO' : 'INACTIVO'}
                    </div>
                </div>

                {/* 1. SECCIÓN PRINCIPAL: SINCRONIZAR */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                    <div className="flex-1 w-full">
                        <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                            <RefreshCw size={16} /> Sincronización Maestra
                        </h4>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <OptionCheckbox label="Huellas" optionKey="syncFingerprints" tooltip="Incluir plantillas de huellas dactilares" />
                            <OptionCheckbox label="Rostros" optionKey="syncFaces" tooltip="Incluir plantillas de reconocimiento facial" />
                            <OptionCheckbox label="Hora" optionKey="syncTime" tooltip="Ajustar la hora del reloj con el servidor" />
                            <OptionCheckbox label="Bajas" optionKey="deleteInactive" tooltip="Eliminar del reloj a los empleados inactivos en BD" />
                        </div>
                    </div>
                    <div className="flex items-center w-full md:w-auto">
                        <Tooltip text="Ejecuta todas las acciones seleccionadas en secuencia">
                            <button
                                onClick={() => onSyncUsers(device, options)}
                                disabled={isBusy || !device.Activo}
                                className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                            >
                                <RefreshCw size={18} className={actionState === 'sync_users' ? 'animate-spin' : ''} />
                                <span className="font-bold text-xs">SINCRONIZAR</span>
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* 2. ENVIAR AL DISPOSITIVO (UPLOAD) */}
                <SectionHeader icon={Upload} title="Enviar al Dispositivo" />
                <div className="grid grid-cols-3 gap-3">
                    <ToolButton 
                        label="Subir Empleados" 
                        icon={Users} 
                        color="indigo"
                        onClick={() => onSyncUsers(device, { pushUsers: true, harvestUsers: false, pushBiometrics: false, syncTime: false }, 'push_users')} 
                        loading={actionState === 'push_users'}
                        tooltip="Envía la lista de empleados activos al dispositivo."
                    />
                    <ToolButton 
                        label="Subir Huellas" 
                        icon={Fingerprint} 
                        color="blue"
                        onClick={() => onSyncFingerprints(device)} 
                        loading={actionState === 'push_fingerprints'}
                        tooltip="Envía las huellas dactilares de la BD al dispositivo."
                    />
                    <ToolButton 
                        label="Subir Rostros" 
                        icon={ScanFace} 
                        color="emerald"
                        onClick={() => onSyncFaces(device)} 
                        loading={actionState === 'push_faces'}
                        tooltip="Envía los rostros de la BD al dispositivo."
                    />
                </div>

                {/* 3. OBTENER DEL DISPOSITIVO (DOWNLOAD) */}
                <SectionHeader icon={Download} title="Obtener del Dispositivo" />
                <div className="grid grid-cols-3 gap-3">
                    <ToolButton 
                        label="Bajar Empleados" 
                        icon={Users} 
                        color="blue"
                        onClick={() => onSyncUsers(device, { harvestUsers: true, pushUsers: false, pushBiometrics: false }, 'download_users')} 
                        loading={actionState === 'download_users'}
                        tooltip="Descarga nuevos empleados creados en el reloj a la BD."
                    />
                    <ToolButton 
                        label="Bajar Huellas" 
                        icon={Fingerprint} 
                        color="blue"
                        onClick={() => onSyncUsers(device, { harvestUsers: true, pushUsers: false, pushBiometrics: false }, 'download_fingerprints')} 
                        loading={actionState === 'download_fingerprints'}
                        tooltip="Descarga nuevas huellas del reloj a la BD."
                    />
                    <ToolButton 
                        label="Bajar Rostros" 
                        icon={ScanFace} 
                        color="emerald"
                        onClick={() => onDownloadFaces(device)} 
                        loading={actionState === 'download_faces'}
                        tooltip="Descarga nuevos rostros del reloj a la BD."
                    />
                </div>

                {/* 4. ELIMINACIÓN Y LIMPIEZA */}
                <SectionHeader icon={Trash2} title="Eliminación y Limpieza" />
                <div className="grid grid-cols-3 gap-3">
                    <ToolButton 
                        label="Borrar Huellas" 
                        icon={Fingerprint} 
                        color="rose"
                        onClick={() => onDeleteFingerprints(device)} 
                        loading={actionState === 'delete_fingerprints'}
                        tooltip="Elimina TODAS las huellas del dispositivo. No afecta la BD."
                    />
                    <ToolButton 
                        label="Borrar Rostros" 
                        icon={ScanFace} 
                        color="rose"
                        onClick={() => onDeleteFaces(device)} 
                        loading={actionState === 'delete_faces'}
                        tooltip="Elimina TODOS los rostros del dispositivo. No afecta la BD."
                    />
                    <ToolButton 
                        label="Borrar Usuarios" 
                        icon={UserX} 
                        color="red"
                        onClick={() => onDeleteUsers(device)} 
                        loading={actionState === 'delete_users'}
                        tooltip="Elimina TODOS los usuarios del dispositivo. No afecta la BD."
                    />
                    <ToolButton 
                        label="Borrar Admins" 
                        icon={ShieldAlert} 
                        color="orange"
                        onClick={() => onDeleteAdmins(device)} 
                        loading={actionState === 'delete_admins'}
                        tooltip="Quita los privilegios de administrador a todos en el dispositivo."
                    />
                    <ToolButton 
                        label="Borrar Inactivos" 
                        icon={UserMinus} 
                        color="orange"
                        onClick={() => onDeleteInactive(device)} 
                        loading={actionState === 'delete_inactive'}
                        tooltip="Elimina del dispositivo a los empleados dados de baja en BD."
                    />
                    <ToolButton 
                        label="Formatear Todo" 
                        icon={Eraser} 
                        color="red"
                        onClick={() => onDeleteAll(device)} 
                        loading={actionState === 'delete_all'}
                        tooltip="Elimina TODO (usuarios, huellas, rostros, logs) del dispositivo."
                    />
                </div>

                {/* 5. UTILIDADES */}
                <SectionHeader icon={Settings} title="Utilidades" />
                <div className="grid grid-cols-3 gap-3">
                    <ToolButton 
                        label="Descargar Checadas" 
                        icon={DownloadCloud} 
                        color="indigo"
                        onClick={() => onSyncLogs(device)} 
                        loading={actionState === 'sync_logs'}
                        tooltip="Descarga los registros de asistencia del dispositivo."
                    />

                    <ToggleToolButton 
                        label="Auto-Borrar Logs" 
                        icon={FileDigit} 
                        onClick={() => onToggleDeleteLogs(device)} 
                        isActive={device.BorrarChecadas}
                        tooltip={device.BorrarChecadas ? "Activado: Se borran logs al descargar." : "Desactivado: Logs se mantienen en el reloj."}
                    />

                    <ToolButton 
                        label="Sincronizar Hora" 
                        icon={Clock} 
                        color="slate"
                        onClick={() => onSyncTime(device)} 
                        loading={actionState === 'sync_time'}
                        tooltip="Ajusta la hora del reloj para que coincida con la del servidor."
                    />
                </div>

            </div>
        </Modal>
    );
};