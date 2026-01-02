// src/features/dashboard/widgets/WeeklyTrendsWidget.tsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, CalendarDays, ArrowUpRight, RefreshCw, Activity, Minus, ArrowDownRight } from 'lucide-react';
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

    // --- Configuración Visual ---
    const getCoordinates = (index: number, value: number) => {
        const len = data.length > 1 ? data.length - 1 : 1;
        const x = (index / len) * 100;
        const safeValue = Math.max(0, Math.min(100, value));
        const y = 100 - safeValue; 
        return { x, y };
    };

    const points = data.map((d, i) => getCoordinates(i, d.value));

    // Curvatura suave (Catmull-Rom simplificado)
    const buildSmoothPath = (pts: {x: number, y: number}[]) => {
        if (pts.length === 0) return "";
        let d = `M ${pts[0].x},${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i === 0 ? 0 : i - 1];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[i + 2] || p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
        }
        return d;
    };

    const smoothPath = points.length > 0 ? buildSmoothPath(points) : "";
    // Área cerrada para relleno sólido sutil
    const areaPath = points.length > 0 ? `${smoothPath} L 100,100 L 0,100 Z` : "";
    
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
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
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

            <div className="flex-1 flex flex-col w-full relative z-10 px-0 pb-0 pt-4">
                {loading ? (
                    <div className="w-full h-full flex items-end gap-3 animate-pulse px-4 pb-4">
                        {[40, 60, 50, 70, 60, 80, 20].map((h, i) => (
                            <div key={i} className="bg-slate-100 rounded-sm flex-1" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                ) : (
                    <div className="w-full h-full relative flex flex-col">
                        
                        {/* Líneas de Guía (Grid) Standard - Coherente con otros gráficos de negocio */}
                        <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-slate-400 font-medium pointer-events-none px-4 pb-6 pt-2">
                            <div className="border-b border-slate-100 w-full flex items-center h-0 relative">
                                <span className="absolute right-0 -top-3 pl-1">100</span>
                            </div>
                            <div className="border-b border-dashed border-slate-100 w-full flex items-center h-0 relative">
                                <span className="absolute right-0 -top-3 pl-1">50</span>
                            </div>
                            <div className="border-b border-slate-200 w-full flex items-center h-0 relative">
                                <span className="absolute right-0 -top-3 pl-1">0</span>
                            </div>
                        </div>

                        {/* Contenedor Gráfico */}
                        <div className="relative flex-1 w-full h-full mb-6">
                            {points.length > 0 && (
                                <svg 
                                    className="absolute inset-0 w-full h-full overflow-visible px-4" 
                                    viewBox="0 0 100 100" 
                                    preserveAspectRatio="none"
                                >
                                    {/* Relleno Sólido pero Transparente - Estilo limpio */}
                                    <path 
                                        d={areaPath} 
                                        fill="#e0e7ff" // indigo-100 sólido, sin degradados raros
                                        fillOpacity="0.4"
                                        className="animate-in fade-in duration-700"
                                    />
                                    
                                    {/* Línea Principal - Clean & Sharp */}
                                    <path 
                                        d={smoothPath} 
                                        fill="none" 
                                        stroke="#6366f1" // indigo-500
                                        strokeWidth="2" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        vectorEffect="non-scaling-stroke" 
                                        className="animate-in zoom-in duration-500"
                                    />
                                </svg>
                            )}

                            {/* Puntos Interactivos Minimalistas */}
                            <div className="absolute inset-0 mx-4"> 
                                {data.map((d, i) => (
                                    <div 
                                        key={i}
                                        className="absolute w-4 h-4 -ml-2 -mt-2 flex items-center justify-center cursor-pointer group/point z-20 outline-none"
                                        style={{ 
                                            left: `${(i / (data.length - 1)) * 100}%`, 
                                            top: `${100 - d.value}%` 
                                        }}
                                        onMouseEnter={() => setHoveredPoint(i)}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                    >
                                        {/* Punto simple y limpio */}
                                        <div className={`
                                            w-2 h-2 rounded-full border-2 transition-all duration-200
                                            ${hoveredPoint === i ? 'bg-indigo-600 border-white scale-125 shadow-md' : 'bg-white border-indigo-500'}
                                        `}></div>

                                        {/* Tooltip Funcional y Directo */}
                                        <div className={`
                                            absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                                            transition-all duration-150 transform
                                            ${hoveredPoint === i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'}
                                        `}>
                                            <div className="bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50">
                                                <span className="font-bold">{d.value}%</span>
                                            </div>
                                            {/* Flecha pequeña */}
                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-800 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Eje X (Días) */}
                        <div className="flex justify-between w-full px-4 text-[10px] font-semibold text-slate-400 -mt-4 pb-3 z-10">
                            {data.map((d, i) => (
                                <div key={i} className={`
                                    flex flex-col items-center w-6 transition-colors duration-200
                                    ${hoveredPoint === i ? 'text-indigo-600' : ''}
                                `}>
                                    <span>{d.day}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};