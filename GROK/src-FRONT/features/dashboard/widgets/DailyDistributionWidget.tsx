// src/features/dashboard/widgets/DailyDistributionWidget.tsx
import React, { useState, useEffect } from 'react';
import { PieChart, MoreHorizontal, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../features/auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { Tooltip } from '../../../components/ui/Tooltip';

export const DailyDistributionWidget = () => {
    // ... (Lógica igual, solo render modificado con Tooltips)
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [percentages, setPercentages] = useState({ present: 0, late: 0, absent: 0, noSchedule: 0 });

    const fetchData = async () => {
        setLoading(true);
        setError(false);
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error loading distribution');
            
            const data = await response.json();
            const total = data.TotalPlantilla || 1; 
            const sinHorario = data.SinHorario || 0;

            setPercentages({
                present: Math.round((data.Presentes / total) * 100),
                late: Math.round((data.Retardos / total) * 100),
                absent: Math.round((data.Ausencias / total) * 100),
                noSchedule: Math.round((sinHorario / total) * 100)
            });

        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    
    const presentRotation = 0; 
    const lateRotation = (percentages.present / 100) * 360; 
    const absentRotation = ((percentages.present + percentages.late) / 100) * 360;
    const noScheduleRotation = ((percentages.present + percentages.late + percentages.absent) / 100) * 360;

    const DonutSegment = ({ color, percent, rotation, delay }: any) => {
        const offset = circumference - (percent / 100) * circumference;
        if (percent <= 0) return null;

        return (
            <circle
                cx="50" cy="50" r={radius}
                fill="none"
                stroke={color}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(${rotation - 90} 50 50)`}
                className={`transition-all duration-1000 ease-out ${loading ? 'opacity-0' : 'opacity-100'}`}
                style={{ transitionDelay: `${delay}ms` }}
            />
        );
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <Tooltip text="Gráfico porcentual de la asistencia del día">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 cursor">
                        <PieChart size={18} className="text-emerald-500" />
                        Distribución
                    </h3>
                </Tooltip>
                 <div className="flex gap-2">
                    {error && (
                         <Tooltip text="Reintentar carga">
                             <button onClick={fetchData} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                                 <RefreshCw size={18} />
                             </button>
                         </Tooltip>
                     )}
                    <button className="text-slate-400 hover:text-indigo-600"><MoreHorizontal size={18}/></button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6">
                
                <div className="relative w-40 h-40 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 md:rotate-0">
                        <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
                        
                        {!loading && !error && (
                            <>
                                <DonutSegment color="#94a3b8" percent={percentages.noSchedule} rotation={noScheduleRotation} delay={900} />
                                <DonutSegment color="#ef4444" percent={percentages.absent} rotation={absentRotation} delay={600} />
                                <DonutSegment color="#f59e0b" percent={percentages.late} rotation={lateRotation} delay={300} />
                                <DonutSegment color="#10b981" percent={percentages.present} rotation={presentRotation} delay={0} />
                            </>
                        )}
                        
                        <text x="50" y="45" textAnchor="middle" dy="0.3em" className="text-[8px] font-bold fill-slate-400 uppercase">Total</text>
                        <text x="50" y="58" textAnchor="middle" dy="0.3em" className="text-[14px] font-bold fill-slate-800">100%</text>
                    </svg>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto">
                    {[
                        { label: 'A tiempo', val: percentages.present, color: 'bg-emerald-500', desc: 'Asistencia correcta' },
                        { label: 'Retardos', val: percentages.late, color: 'bg-amber-500', desc: 'Entrada tarde' },
                        { label: 'Ausencias', val: percentages.absent, color: 'bg-rose-500', desc: 'Falta injustificada' },
                        { label: 'Sin Horario', val: percentages.noSchedule, color: 'bg-slate-400', desc: 'Descanso o sin turno' }
                    ].map((item, i) => (
                        <Tooltip key={i} text={`${item.desc}: ${item.val}%`}>
                            <div className="flex items-center justify-between gap-4 text-sm cursor">
                                <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${item.color} ${loading ? 'animate-pulse' : ''}`}></span>
                                    <span className="text-slate-600">{item.label}</span>
                                </div>
                                <span className="font-bold text-slate-800">{loading ? '-' : `${item.val}%`}</span>
                            </div>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </div>
    );
};