// src/features/dashboard/widgets/WeeklyTrendsWidget.tsx
import React, { useState, useEffect } from 'react';
import { BarChart2, CalendarDays, ArrowUpRight, RefreshCw, Minus, ArrowDownRight, Activity } from 'lucide-react';
import { useAuth } from '../../../features/auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { Tooltip } from '../../../components/ui/Tooltip';

export const WeeklyTrendsWidget = () => {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any[]>([]);
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [showTrendLine, setShowTrendLine] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
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
            setError('No se pudo cargar la tendencia.');
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setIsMounted(false);
        if (!loading && data.length > 0) {
            const timer = setTimeout(() => setIsMounted(true), 50);
            return () => clearTimeout(timer);
        }
    }, [loading, data.length]);

    const validValues = data.map(d => d.value);
    const avg = validValues.length > 0 
        ? Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length) 
        : 0;
    
    const minVal = validValues.length > 0 ? Math.min(...validValues) : 0;
    const maxVal = validValues.length > 0 ? Math.max(...validValues) : 0;

    let trend = 0;
    if (data.length >= 2) {
        trend = data[data.length - 1].value - data[data.length - 2].value;
    }

    const renderTrendIndicator = () => {
        if (trend === 0) return <span className="text-slate-400 flex items-center"><Minus size={12} className="mr-1"/> Sin cambio</span>;
        if (trend > 0) return <span className="text-emerald-600 flex items-center font-bold">+{trend}% <ArrowUpRight size={14} className="ml-1"/></span>;
        return <span className="text-rose-600 flex items-center font-bold">{trend}% <ArrowDownRight size={14} className="ml-1"/></span>;
    };

    const getLinePoints = () => {
        if (data.length === 0) return "";
        const slotWidth = 100 / data.length;
        return data.map((d, i) => {
            let x = i * slotWidth + slotWidth / 2;
            if (i === data.length - 1) x -= 1; // Pequeño ajuste para sábado
            const y = 100 - Math.max(2, d.value);
            return `${x},${y}`;
        }).join(' ');
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start p-4 pb-2 z-10">
                <div>
                    <Tooltip text="Comportamiento de la asistencia en los últimos 7 días.">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-1 cursor">
                            <BarChart2 size={18} className="text-indigo-500" />
                            Tendencia Semanal
                        </h3>
                    </Tooltip>
                    <div className="flex items-baseline gap-3 ml-4">
                        {loading ? (
                             <div className="h-8 w-24 bg-slate-100 animate-pulse rounded"></div>
                        ) : (
                            <>
                                <Tooltip text={`Promedio de asistencia de la semana: ${avg}%`}>
                                    <span className="text-3xl font-bold text-slate-800 cursor">{avg}%</span>
                                </Tooltip>
                                <Tooltip text="Cambio en el promedio de asistencia respecto al día anterior.">
                                    <div className="flex flex-col text-xs cursor">
                                        <span className="text-slate-500 font-medium">Promedio</span>
                                        {renderTrendIndicator()}
                                    </div>
                                </Tooltip>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                     <div className="flex gap-1">
                        <Tooltip text={showTrendLine ? "Ocultar línea de tendencia" : "Mostrar línea de tendencia"}>
                            <button 
                                onClick={() => setShowTrendLine(!showTrendLine)}
                                className={`p-1 rounded transition-colors ${showTrendLine ? 'text-indigo-500 bg-indigo-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Activity size={14} />
                            </button>
                        </Tooltip>
                        {error && (
                            <Tooltip text="Recargar datos">
                                <button onClick={fetchData} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                                    <RefreshCw size={14} />
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip text="Datos de los últimos 7 días.">
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor">
                                <CalendarDays size={12} /> 7 Días
                            </span>
                        </Tooltip>
                    </div>
                    {!loading && data.length > 0 && (
                        <div className="flex gap-3 text-[10px] text-slate-400 font-medium">
                            <Tooltip text="Día con menor asistencia en la semana."><span className="cursor">Min: <span className="text-slate-600">{minVal}%</span></span></Tooltip>
                            <Tooltip text="Día con mayor asistencia en la semana."><span className="cursor">Max: <span className="text-slate-600">{maxVal}%</span></span></Tooltip>
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
                    <div className="w-full h-full flex flex-col relative group/chart">
                        <div className="flex-1 relative w-full z-20">
                            {/* Eje Y */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0 pr-4">
                            {[100, 75, 50, 25, 0].map((val) => (
                                <div key={val} className="flex items-center text-right">
                                    <span className="text-[9px] text-slate-400 w-6 pr-2">{val}%</span>
                                    <div className="flex-1 border-b border-slate-100 h-0"></div>
                                </div>
                            ))}
                            </div>

                            {/* Línea de promedio + bolita al final con title nativo */}
                            {!loading && data.length > 0 && (
                                <div className="absolute inset-0 z-10 pointer-events-none">
                                    {/* Línea punteada */}
                                    <div 
                                        className="absolute left-0 border-t-2 border-dashed border-amber-400 opacity-75"
                                        style={{ bottom: `${avg}%`, width: 'calc(100% - 20px)' }}
                                    />
                                    {/* Bolita con title nativo */}
                                    <Tooltip text={`Promedio semanal: ${avg}%`}>
                                        <div 
                                            className="absolute w-4 h-4 bg-amber-400 rounded-full border-4 border-white shadow-lg cursor hover:scale-125 transition-transform pointer-events-auto"
                                            style={{ 
                                                bottom: `calc(${avg}% - 8px)`, // centra verticalmente
                                                right: '8px' // pegada al borde
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            )}

                            {/* Contenedor Barras + SVG */}
                            <div className="absolute inset-0 pl-6 flex items-end">
                                {/* Línea de tendencia */}
                                {showTrendLine && !loading && data.length > 0 && (
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                        <polyline 
                                            points={getLinePoints()} 
                                            fill="none" 
                                            stroke="#6366f1" 
                                            strokeWidth="2.5" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                            vectorEffect="non-scaling-stroke"
                                            className="drop-shadow-sm"
                                        />
                                    </svg>
                                )}

                                {/* Barras */}
                                <div className="w-full h-full flex items-end">
                                {data.map((d, i) => {
                                    const height = isMounted ? Math.max(2, d.value) : 0;
                                    const isHovered = hoveredPoint === i;
                                    const isMax = d.value === maxVal && maxVal > 0;
                                    const isAboveAvg = d.value >= avg;

                                    const barColorClass = isMax
                                        ? 'bg-emerald-400'
                                        : isAboveAvg
                                            ? 'bg-indigo-500'
                                            : 'bg-slate-200';
                                    
                                    const hoverColorClass = isMax
                                        ? 'group-hover:bg-emerald-500'
                                        : isAboveAvg
                                            ? 'group-hover:bg-indigo-600'
                                            : 'group-hover:bg-slate-300';
                                    
                                    return (
                                        <div 
                                            key={i}
                                            className="flex-1 h-full flex flex-col justify-end items-center relative"
                                        >
                                            {/* Tooltip del día, centrado */}
                                            <div className={`
                                                absolute bottom-full mb-2 transition-all duration-200 transform z-20 left-1/2 -translate-x-1/2
                                                ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'}
                                            `}>
                                                <div className="bg-slate-800 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap relative">
                                                    {d.day}: {d.value}%
                                                    <div className="w-2 h-2 bg-slate-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                                </div>
                                            </div>

                                            {/* Barra con hover solo aquí */}
                                            <div 
                                                className={`transition-all duration-700 ease-in-out ${barColorClass} ${hoverColorClass} rounded-t-md cursor-pointer group`}
                                                style={{ 
                                                    height: `${height}%`, 
                                                    width: '70%',           
                                                    maxWidth: '36px',
                                                    transform: 'translateX(-50%)',  
                                                    transitionDelay: `${i * 40}ms`
                                                }}
                                                onMouseEnter={() => setHoveredPoint(i)}
                                                onMouseLeave={() => setHoveredPoint(null)}
                                            />
                                        </div>
                                    );
                                })}
                                </div>
                            </div>
                        </div>

                        {/* Eje X */}
                        <div className="h-6 flex justify-between w-full pl-6 z-20">
                            {data.map((d, i) => {
                                const isHovered = hoveredPoint === i;
                                return (
                                    <div 
                                        key={i} 
                                        className="flex-1 flex justify-center items-center cursor-pointer"
                                        onMouseEnter={() => setHoveredPoint(i)}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                    >
                                        <span className={`
                                            text-[10px] font-medium transition-colors duration-200 uppercase tracking-wider inline-block transform -translate-x-[35%]
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