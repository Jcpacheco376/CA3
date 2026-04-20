import React, { useState } from 'react';
import { API_BASE_URL } from '../../../config/api.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import { Modal, Button } from '../../../components/ui/Modal.tsx';
import {
    Clock, CalendarDays, Settings, Sun, Timer, Play, Pause, Info, Coffee
} from 'lucide-react';

interface ConfigurarProcesoModalProps {
    proceso: any;
    onClose: () => void;
    onSuccess: () => void;
}

interface UnifiedCronState {
    mode: 'unified' | 'advanced';
    frequencyType: 'once' | 'interval';
    daysType: 'all' | 'specific';
    onceTime: string;
    intervalValue: number | string;
    intervalUnit: 'minutes' | 'hours';
    hasWindow: boolean;
    startHour: string;
    endHour: string;
    selectedDays: number[];
}

// Reusable ToggleSwitch matching HorarioModal.tsx style
const ToggleSwitch = ({ checked, onChange, themeColor = '#6366f1' }: { checked: boolean, onChange: (checked: boolean) => void, themeColor?: string }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
            style={{
                backgroundColor: checked ? themeColor : '#E5E7EB'
            } as any}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out`}
            />
        </button>
    );
};

// Reusable TimeInput matching HorarioModal.tsx style
const TimeInput = ({ label, value, onChange, disabled, icon }: any) => (
    <div className="flex flex-col">
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
            {icon} {label}
        </label>
        <input type="time" value={value || '00:00'} onChange={onChange} disabled={disabled}
            className="w-full text-sm rounded-lg border-slate-200 p-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all" />
    </div>
);

const parseToUnified = (cron: string): UnifiedCronState => {
    const base: UnifiedCronState = {
        mode: 'advanced', frequencyType: 'once', daysType: 'all', onceTime: '00:00',
        intervalValue: 10, intervalUnit: 'minutes', hasWindow: false, startHour: '08', endHour: '18', selectedDays: []
    };
    if (!cron) return base;
    const parts = cron.split(' ');
    if (parts.length !== 5) return base;
    if (parts[4] !== '*') { base.daysType = 'specific'; base.selectedDays = parts[4].split(',').map(Number); }
    const hourPart = parts[1];
    const minPart = parts[0];
    if (!isNaN(Number(minPart)) && !isNaN(Number(hourPart))) {
        base.frequencyType = 'once'; base.onceTime = `${hourPart.padStart(2, '0')}:${minPart.padStart(2, '0')}`; base.mode = 'unified';
    } else {
        base.frequencyType = 'interval'; base.mode = 'unified';
        if (hourPart.includes('-')) {
            base.hasWindow = true;
            const [range, step] = hourPart.split('/');
            const [start, end] = range.split('-');
            base.startHour = start.padStart(2, '0'); base.endHour = end.padStart(2, '0');
            if (minPart.startsWith('*/')) { base.intervalUnit = 'minutes'; base.intervalValue = parseInt(minPart.replace('*/', '')); }
            else if (minPart === '*') { base.intervalUnit = 'minutes'; base.intervalValue = 1; }
            else if (minPart === '0') { base.intervalUnit = 'hours'; base.intervalValue = step ? parseInt(step) : 1; }
        } else {
            if (minPart.startsWith('*/')) { base.intervalUnit = 'minutes'; base.intervalValue = parseInt(minPart.replace('*/', '')); }
            else if (minPart === '*') { base.intervalUnit = 'minutes'; base.intervalValue = 1; }
            else if (hourPart.startsWith('*/')) { base.intervalUnit = 'hours'; base.intervalValue = parseInt(hourPart.replace('*/', '')); }
            else if (hourPart === '*' && minPart === '0') { base.intervalUnit = 'hours'; base.intervalValue = 1; }
        }
    }
    return base;
};

const compileCron = (s: UnifiedCronState) => {
    if (s.mode === 'advanced') return String(s.intervalValue);
    let cronParts = ['*', '*', '*', '*', '*'];
    cronParts[4] = s.daysType === 'all' ? '*' : s.selectedDays.sort().join(',');
    if (s.frequencyType === 'once') {
        const [h, m] = s.onceTime.split(':');
        cronParts[0] = parseInt(m).toString(); cronParts[1] = parseInt(h).toString();
    } else {
        const hRange = s.hasWindow ? `${parseInt(s.startHour)}-${parseInt(s.endHour)}` : '*';
        if (s.intervalUnit === 'minutes') {
            cronParts[0] = s.intervalValue === 1 ? '*' : `*/${s.intervalValue}`; cronParts[1] = hRange;
        } else {
            cronParts[0] = '0';
            cronParts[1] = s.hasWindow ? (s.intervalValue === 1 ? hRange : `${hRange}/${s.intervalValue}`) : (s.intervalValue === 1 ? '*' : `*/${s.intervalValue}`);
        }
    }
    return cronParts.join(' ');
};

export const ConfigurarProcesoModal: React.FC<ConfigurarProcesoModalProps> = ({ proceso, onClose, onSuccess }) => {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [state, setState] = useState<UnifiedCronState>(() => parseToUnified(proceso.CronExpression));
    const [activo, setActivo] = useState<boolean>(proceso.Activo === true || proceso.Activo === 1);

    const handleSave = async () => {
        setLoading(true);
        try {
            const finalCron = state.mode === 'advanced' ? String(state.intervalValue) : compileCron(state);
            const res = await fetch(`${API_BASE_URL}/processes/${proceso.ProcesoId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...proceso, CronExpression: finalCron, Activo: Boolean(activo) })
            });
            if (!res.ok) throw new Error('Error al guardar');
            onSuccess();
        } catch (error: any) { alert('Error: ' + error.message); }
        finally { setLoading(false); }
    };

    return (
        <Modal
            isOpen={true} onClose={onClose} title={`Configurar: ${proceso.Nombre}`} size="2xl"
            footer={
                <div className="flex justify-end gap-2 w-full">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading}>{loading ? 'Guardando...' : 'Guardar Configuración'}</Button>
                </div>
            }
        >
            <div className="space-y-6 py-2">
                {/* Info Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3">
                    <Info size={18} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600 leading-relaxed">{proceso.Descripcion}</p>
                </div>

                {/* Days Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-3">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <CalendarDays size={14} /> Días de ejecución
                        </label>
                        <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setState({ ...state, daysType: 'all', mode: 'unified' })}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${state.daysType === 'all' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                            >Diario</button>
                            <button
                                onClick={() => setState({ ...state, daysType: 'specific', mode: 'unified' })}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${state.daysType === 'specific' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                            >Personalizado</button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className={`flex gap-1.5 justify-center md:justify-end transition-opacity ${state.daysType === 'specific' ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
                            {[{ v: 1, l: 'L' }, { v: 2, l: 'M' }, { v: 3, l: 'M' }, { v: 4, l: 'J' }, { v: 5, l: 'V' }, { v: 6, l: 'S' }, { v: 0, l: 'D' }].map(d => (
                                <button
                                    key={d.v}
                                    onClick={() => setState(prev => ({ ...prev, selectedDays: prev.selectedDays.includes(d.v) ? prev.selectedDays.filter(x => x !== d.v) : [...prev.selectedDays, d.v] }))}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${state.selectedDays.includes(d.v) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                >{d.l}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Frequency Selection */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Timer size={14} /> Frecuencia del día
                        </label>
                        <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200 w-64">
                            <button
                                onClick={() => setState({ ...state, frequencyType: 'once', mode: 'unified' })}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${state.frequencyType === 'once' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                            >Una vez</button>
                            <button
                                onClick={() => setState({ ...state, frequencyType: 'interval', mode: 'unified' })}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${state.frequencyType === 'interval' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                            >Intervalo</button>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 min-h-[160px] flex flex-col justify-center">
                        {state.frequencyType === 'once' ? (
                            <div className="flex justify-center items-center py-2">
                                <div className="w-full max-w-[200px]">
                                    <TimeInput label="Hora de ejecución" value={state.onceTime} onChange={(e: any) => setState({ ...state, onceTime: e.target.value })} icon={<Clock size={12} />} />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-6 items-end">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Repetir cada</label>
                                        <div className="flex gap-2">
                                            <input type="number" min="1" value={state.intervalValue} onChange={e => setState({ ...state, intervalValue: parseInt(e.target.value) || 1 })}
                                                className="w-full text-sm rounded-lg border-slate-200 py-2 px-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                                            <select value={state.intervalUnit} onChange={e => setState({ ...state, intervalUnit: e.target.value as any })}
                                                className="text-xs font-bold bg-slate-50 border-slate-200 rounded-lg px-2 focus:outline-none cursor-pointer">
                                                <option value="minutes">MIN</option>
                                                <option value="hours">HRS</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-3 pb-2.5">
                                        <span className="text-xs font-bold text-slate-500">Restringir ventana</span>
                                        <ToggleSwitch checked={state.hasWindow} onChange={(v) => setState({ ...state, hasWindow: v })} themeColor="#6366f1" />
                                    </div>
                                </div>

                                {state.hasWindow && (
                                    <div className="grid grid-cols-2 gap-6 animate-content-fade-in">
                                        <TimeInput label="Horario de inicio" value={`${state.startHour}:00`} onChange={(e: any) => setState({ ...state, startHour: e.target.value.split(':')[0] })} icon={<Sun size={12} />} />
                                        <TimeInput label="Horario de término" value={`${state.endHour}:00`} onChange={(e: any) => setState({ ...state, endHour: e.target.value.split(':')[0] })} icon={<Coffee size={12} />} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Status and Advanced */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 items-stretch">
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <ToggleSwitch checked={activo} onChange={setActivo} themeColor="#10b981" />
                        <div>
                            <span className="block text-sm font-bold text-slate-700">Automatización</span>
                            <span className={`block text-[10px] font-bold uppercase tracking-wider transition-colors ${activo ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {activo ? 'Habilitada' : 'Pausada'}
                            </span>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                            <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-widest pl-1">EXPRESIÓN CRON</span>
                            <span className="block text-sm font-mono font-bold text-indigo-600 pl-1">{compileCron(state)}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (state.mode === 'unified') setState({ ...state, mode: 'advanced', intervalValue: compileCron(state) });
                                else setState(parseToUnified(String(state.intervalValue)));
                            }}
                            className={`p-2 rounded-lg text-xs font-bold transition-all ${state.mode === 'advanced' ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-slate-200'}`}
                            title="Modo Experto"
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                </div>

                {state.mode === 'advanced' && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-2 animate-content-fade-in">
                        <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                            Modo Experto
                        </label>
                        <input
                            type="text"
                            value={state.intervalValue}
                            onChange={e => setState({ ...state, intervalValue: e.target.value })}
                            className="w-full bg-white border-amber-200 rounded-lg p-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                            placeholder="* * * * *"
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};
