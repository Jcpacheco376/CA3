// src/features/dashboard/widgets/WeeklyTrendsWidget.tsx
import React, { useState, useEffect } from 'react';
import { BarChart2, CalendarDays, ArrowUpRight, RefreshCw, Minus, ArrowDownRight } from 'lucide-react';
import { useAuth } from '../../../features/auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';

export const WeeklyTrendsWidget = () => {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [data, setData] = useState<any[]>([]);
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(false);
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/dashboard/trends`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error loading trends');
            
            const result = await response.json();
            if (Array.isArray(result)) {
                setData(result);
            } else {
                 setData([]);
            }
        } catch (err) {
            console.error(err);
            setError(true);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Cálculos estadísticos básicos
    const validValues = data.map(d => d.value);
    const avg = validValues.length > 0 
        ? Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length) 
        : 0;
    
    const minVal = validValues.length > 0 ? Math.min(...validValues) : 0;
    const maxVal = validValues.length > 0 ? Math.max(...validValues) : 0;

    // Calcular tendencia
    let trend = 0;
    if (data.length >= 2) {
        trend = data[data.length - 1].value - data[data.length - 2].value;
    }

    const renderTrendIndicator = () => {
        if (trend === 0) return <span className="text-slate-400 flex items-center"><Minus size={12} className="mr-1"/> Sin cambio</span>;
        if (trend > 0) return <span className="text-emerald-600 flex items-center font-bold">+{trend}% <ArrowUpRight size={14} className="ml-1"/></span>;
        return <span className="text-rose-600 flex items-center font-bold">{trend}% <ArrowDownRight size={14} className="ml-1"/></span>;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col relative overflow-hidden">
            {/* Header Limpio y Coherente */}
            <div className="flex justify-between items-start p-4 pb-2 z-10">
                <div>
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-1">
                        <BarChart2 size={18} className="text-indigo-500" />
                        Tendencia Semanal
                    </h3>
                    <div className="flex items-baseline gap-3 ml-4">
                        {loading ? (
                             <div className="h-8 w-24 bg-slate-100 animate-pulse rounded"></div>
                        ) : (
                            <>
                                <span className="text-3xl font-bold text-slate-800">{avg}%</span>
                                <div className="flex flex-col text-xs">
                                    <span className="text-slate-500 font-medium">Promedio</span>
                                    {renderTrendIndicator()}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Controles y Contexto */}
                <div className="flex flex-col items-end gap-2">
                     <div className="flex gap-1">
                        {error && (
                            <button onClick={fetchData} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Reintentar">
                                <RefreshCw size={14} />
                            </button>
                        )}
                        <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <CalendarDays size={12} /> 7 Días
                        </span>
                    </div>
                    {/* Mini resumen de Min/Max para dar utilidad al gráfico */}
                    {!loading && data.length > 0 && (
                        <div className="flex gap-3 text-[10px] text-slate-400 font-medium">
                            <span>Min: <span className="text-slate-600">{minVal}%</span></span>
                            <span>Max: <span className="text-slate-600">{maxVal}%</span></span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col w-full relative z-10 px-4 pb-4 pt-2">
                {loading ? (
                    <div className="w-full h-full flex items-end gap-2 animate-pulse">
                        {[40, 60, 50, 70, 60, 80, 20].map((h, i) => (
                            <div key={i} className="bg-slate-100 rounded-t-lg flex-1" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col justify-end relative">
                        {/* Grid lines background */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
                            {[100, 75, 50, 25, 0].map((val) => (
                                <div key={val} className="border-b border-slate-50 w-full h-0"></div>
                            ))}
                        </div>

                        <div className="flex justify-between items-end h-full gap-2 z-10">
                            {data.map((d, i) => {
                                const height = Math.max(4, d.value);
                                const isHovered = hoveredPoint === i;
                                const isMax = d.value === maxVal && maxVal > 0;
                                
                                return (
                                    <div 
                                        key={i}
                                        className="flex flex-col items-center justify-end h-full flex-1 group relative cursor-pointer"
                                        onMouseEnter={() => setHoveredPoint(i)}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                    >
                                        {/* Tooltip */}
                                        <div className={`
                                            absolute bottom-full mb-2 transition-all duration-200 transform z-20
                                            ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}
                                        `}>
                                            <div className="bg-slate-800 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap relative">
                                                {d.value}%
                                                <div className="w-2 h-2 bg-slate-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                            </div>
                                        </div>

                                        {/* Bar */}
                                        <div 
                                            className={`
                                                w-full max-w-[32px] rounded-t-lg transition-all duration-500 ease-out relative overflow-hidden
                                                ${isHovered ? '-translate-y-1 shadow-lg shadow-indigo-200/50' : ''}
                                            `}
                                            style={{ height: `${height}%` }}
                                        >
                                            {/* Gradient Fill */}
                                            <div className={`
                                                absolute inset-0 bg-gradient-to-t 
                                                ${isMax ? 'from-emerald-500 to-emerald-300' : 'from-indigo-600 to-violet-400'}
                                                opacity-90 group-hover:opacity-100 transition-opacity duration-300
                                            `}></div>
                                            
                                            {/* Glass/Shine Effect */}
                                            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent"></div>
                                        </div>

                                        {/* Label */}
                                        <span className={`
                                            text-[10px] font-medium mt-2 transition-colors duration-200 uppercase tracking-wider
                                            ${isHovered ? 'text-indigo-600 font-bold' : 'text-slate-400'}
                                        `}>
                                            {d.day ? d.day.substring(0, 3) : ''}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};