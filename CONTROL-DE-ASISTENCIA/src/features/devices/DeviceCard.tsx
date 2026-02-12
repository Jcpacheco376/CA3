// src/features/devices/DeviceCard.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
    Server, Wifi, MapPin, Clock, MoreVertical, RefreshCw, 
    DownloadCloud, Activity, Users, Fingerprint, Trash2, 
    ToggleRight, ToggleLeft, CheckCircle2, AlertCircle, Pencil,
    Hash, KeyRound, PowerOff, Loader2
} from 'lucide-react';
import { Tooltip } from  '../../components/ui/Tooltip';
import { useAuth } from '../auth/AuthContext';
import { themes } from '../../config/theme';
import { Button } from '../../components/ui/Modal';

export interface Device {
    DispositivoId: number;
    Nombre: string;
    IpAddress: string;
    Puerto: number;
    ZonaId: number;
    ZonaNombre?: string;
    ZonaColor?: string;
    Activo: boolean;
    Estado: string;
    UltimaSincronizacion?: string;
    BorrarChecadas: boolean;
    PasswordCom?: string;
    TieneContrasena?: boolean;
}

interface DeviceCardProps {
    device: Device;
    actionState: 'sync_logs' | 'sync_users' | 'test' | 'sync_time' | null;
    onSyncLogs: (device: Device) => void;
    onSyncUsers: (device: Device) => void;
    onEdit: (device: Device) => void;
    onTestConnection: (id: number) => void;
    onToggleDeleteLogs: (device: Device) => void;
    onSyncTime: (device: Device) => void;
}

export const DeviceCard = ({
    device,
    actionState,
    onSyncLogs,
    onSyncUsers,
    onEdit,
    onTestConnection,
    onToggleDeleteLogs,
    onSyncTime
}: DeviceCardProps) => {
    const { user, can } = useAuth();
    const userTheme = user?.Theme?.toLowerCase() || 'indigo';
    const currentTheme = themes[userTheme] || themes.indigo;
    
    const zoneColorName = device.ZonaColor || 'indigo';
    const zoneTheme = themes[zoneColorName as keyof typeof themes] || themes.indigo;

    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isBusy = actionState !== null;

    // --- Permisos ---
    const canUpdate = can('dispositivos.manage');
    const canSyncLogs = can('dispositivos.sync_logs');
    const canSyncUsers = can('dispositivos.sync_users');
    
    const hasMenuActions = canUpdate || canSyncUsers;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getStatusBadge = (status: string) => {
        // Diseño más sutil y profesional para el badge
        const baseClasses = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium border";

        if (actionState === 'test') {
            return (
                <Tooltip text="Verificando conexión...">
                    <span className={`${baseClasses} bg-indigo-50 text-indigo-700 border-indigo-100`}>
                        <Loader2 size={10} className="animate-spin" />
                        PROBANDO
                    </span>
                </Tooltip>
            );
        }

        if (!device.Activo) {
            return (
                <Tooltip text="Dispositivo deshabilitado manualmente">
                    <span className={`${baseClasses} bg-slate-100 text-slate-500 border-slate-200`}>
                        <PowerOff size={10} />
                        INACTIVO
                    </span>
                </Tooltip>
            );
        }

        const isOnline = status === 'Conectado';
        const isUnknown = status === 'Desconocido' || !status;
        
        if (isOnline) {
            return (
                <Tooltip text="El dispositivo está conectado y operativo">
                    <span className={`${baseClasses} bg-emerald-50 text-emerald-700 border-emerald-100`}>
                        <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        ONLINE
                    </span>
                </Tooltip>
            );
        }
        
        if (isUnknown) {
            return (
                <Tooltip text="Estado desconocido, intente probar conexión">
                    <span className={`${baseClasses} bg-slate-50 text-slate-600 border-slate-200`}>
                        <Activity size={10} />
                        DESCONOCIDO
                    </span>
                </Tooltip>
            );
        }

        return (
            <Tooltip text="No se puede establecer conexión con el dispositivo">
                <span className={`${baseClasses} bg-rose-50 text-rose-700 border-rose-100`}>
                    <AlertCircle size={10} />
                    OFFLINE
                </span>
            </Tooltip>
        );
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-full group relative">
            {/* Header */}
            <div className="p-4 flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <Tooltip text={`Dispositivo: ${device.Nombre}`}>
                        <div className="p-2 rounded-lg shrink-0 bg-slate-50 text-slate-500">
                            <Server size={18} strokeWidth={1.5} />
                        </div>
                    </Tooltip>
                    <div>
                        <h3 className="font-bold text-slate-700 text-sm leading-tight truncate max-w-[140px]">{device.Nombre}</h3>
                        <div className="mt-0.5">
                            {getStatusBadge(device.Estado)}
                        </div>
                    </div>
                </div>
                
                <div className="relative" ref={menuRef}>
                    {hasMenuActions && (
                        <Tooltip text="Más opciones">
                            <button 
                                onClick={() => setShowMenu(!showMenu)}
                                className="text-slate-300 hover:text-indigo-500 p-1.5 rounded-full hover:bg-indigo-50 transition-colors"
                            >
                                <MoreVertical size={20} />
                            </button>
                        </Tooltip>
                    )}

                    {/* Menú Desplegable */}
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-100 z-50 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Mantenimiento
                            </div>
                            {canUpdate && (
                                <Tooltip text="Modificar configuración del dispositivo" position="left">
                                    <button
                                        onClick={() => { onEdit(device); setShowMenu(false); }}
                                        disabled={isBusy}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors disabled:opacity-50 hover:text-slate-900"
                                    >
                                        <Pencil size={16} /> Editar
                                    </button>
                                </Tooltip>
                            )}
                              
                                <Tooltip text="Verificar conectividad con el dispositivo" position="left">
                                    <button
                                        onClick={() => { onTestConnection(device.DispositivoId); setShowMenu(false); }}
                                        disabled={isBusy || !device.Activo}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors disabled:opacity-50 hover:text-slate-900"
                                    >
                                        <Activity size={16} /> Probar Conexión
                                    </button>
                                </Tooltip>
                            
                            {canUpdate && (
                                <Tooltip text="Ajustar hora del reloj con el servidor" position="left">
                                    <button
                                        onClick={() => { onSyncTime(device); setShowMenu(false); }}
                                        disabled={isBusy || !device.Activo}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors disabled:opacity-50 hover:text-slate-900"
                                    >
                                        <Clock size={16} /> Sincronizar Hora
                                    </button>
                                </Tooltip>
                            )}
                            {canSyncUsers && (
                                <Tooltip text="Enviar empleados y huellas al dispositivo" position="left">
                                    <button
                                        onClick={() => { onSyncUsers(device); setShowMenu(false); }}
                                        disabled={isBusy || !device.Activo}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors disabled:opacity-50 hover:text-slate-900"
                                    >
                                        <Users size={16} /> Sincronizar Personal
                                    </button>
                                </Tooltip>
                            )}

                            {canUpdate && (
                                <>
                                    <div className="my-1 border-t border-slate-100"></div>
                                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Configuración
                                    </div>
                                    <Tooltip text="Borrar registros del reloj tras descarga" position="left">
                                        <button
                                            onClick={() => { onToggleDeleteLogs(device); }}
                                            disabled={isBusy || !device.Activo}
                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between gap-2 transition-colors disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Trash2 size={16} /> Auto-limpiar
                                            </div>
                                            <div 
                                                className={device.BorrarChecadas ? "" : "text-slate-300"}
                                                style={device.BorrarChecadas ? { color: currentTheme[600] } : {}}
                                            >
                                                {device.BorrarChecadas ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                            </div>
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Body: Dashboard de Datos */}
            <div className="px-4 py-3 flex-1">
                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div className="space-y-1">
                        <Tooltip text="ID único del dispositivo en base de datos">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1 w-fit ">
                                <Hash size={10} /> ID Sistema
                            </span>
                        </Tooltip>
                        <p className="text-sm font-medium text-slate-700 font-mono">#{device.DispositivoId}</p>
                    </div>

                    <div className="space-y-1">
                       
                    </div>

                    <div className="space-y-1">
                        <Tooltip text="Dirección IP del dispositivo en la red">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1 w-fit ">
                                <Wifi size={10} /> IP Address
                            </span>
                        </Tooltip>
                        <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-slate-700 font-mono bg-slate-50 px-1.5 rounded border border-slate-100 inline-block">
                                {device.IpAddress}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Tooltip text="Puerto de conexión (Default: 4370)">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1 w-fit ">
                                <Server size={10} /> Puerto
                            </span>
                        </Tooltip>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-700 font-mono">{device.Puerto}</p>
                            
                            {!!device.TieneContrasena && (
                                
                                <Tooltip text="Protegido con contraseña">
                                    <div className="flex items-center justify-center w-5 h-5 bg-amber-50 rounded border border-amber-100 text-amber-600">
                                        <KeyRound size={12} />
                                    </div>
                                </Tooltip>
                            )}
                        </div>
                    </div>

                    <div className="col-span-2 pt-2 border-t border-slate-50 mt-1">
                        <div className="flex justify-between items-center">
                            <div className="space-y-0.5">
                                <Tooltip text="Fecha de la última descarga de registros exitosa">
                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1 w-fit ">
                                        <Clock size={10} /> Última Sincronización
                                    </span>
                                </Tooltip>
                                <p className="text-xs font-medium text-slate-600">
                                    {device.UltimaSincronizacion
                                        ? new Date(device.UltimaSincronizacion).toLocaleString('es-MX', {
                                            weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })
                                        : 'Nunca'}
                                </p>
                            </div>
                            {device.BorrarChecadas && (
                                <Tooltip text="Se borran registros del dispositivo tras descargar">
                                    <div className="flex flex-col items-end ">
                                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Auto-limpieza</span>
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                            ACTIVADA
                                        </span>
                                    </div>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer: Acción Principal */}
            <div className="p-3 pt-0 mt-auto">
                {canSyncLogs ? (
                    <Tooltip text={!device.Activo ? "Habilite el dispositivo para descargar asistencia" : "Descargar nuevos registros de asistencia del dispositivo"}>
                        <Button
                            onClick={() => onSyncLogs(device)}
                            disabled={isBusy || !device.Activo}
                            className="w-full py-2 text-xs shadow-sm"
                            style={{
                                '--theme-500': zoneTheme[500],
                                '--theme-600': zoneTheme[600],
                                '--theme-700': zoneTheme[700]
                            } as React.CSSProperties}
                        >
                            {actionState === 'sync_logs' ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <DownloadCloud size={18} />
                            )}
                            <span>
                                {actionState === 'sync_logs' ? 'Descargando Registros...' : 'Descargar Asistencia'}
                            </span>
                        </Button>
                    </Tooltip>
                ) : (
                    <div className="w-full py-2 px-4 text-slate-400 text-xs font-medium text-center bg-slate-50 rounded-lg border border-slate-100 cursor-not-allowed">
                        Sin permiso de descarga
                    </div>
                )}
            </div>
        </div>
    );
};
