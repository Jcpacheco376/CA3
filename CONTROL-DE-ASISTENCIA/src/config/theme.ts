// src/config/theme.ts

// Definición completa de colores hexadecimales para uso en estilos en línea (JS)
export const themes: { [key: string]: { [key: number]: string } } = {
    // NEUTRO PROFESIONAL (Base del sistema)
    slate:   { 50: '#f8fafc', 100: '#f1f5f9', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 900: '#0f172a' },
    
    // GAMA CÁLIDA (Alertas, Errores, Atención)
    red:     { 50: '#fef2f2', 100: '#fee2e2', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 900: '#7f1d1d' },
    orange:  { 50: '#fff7ed', 100: '#ffedd5', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 900: '#7c2d12' },
    amber:   { 50: '#fffbeb', 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 900: '#78350f' },
    yellow:  { 50: '#fefce8', 100: '#fef9c3', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 900: '#713f12' },
    
    // GAMA NATURAL (Éxito, Dinero, Activo)
    lime:    { 50: '#f7fee7', 100: '#ecfccb', 400: '#bef264', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 900: '#365314' },
    green:   { 50: '#f0fdf4', 100: '#dcfce7', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 900: '#14532d' },
    emerald: { 50: '#ecfdf5', 100: '#d1fae5', 400: '#6ee7b7', 500: '#10b981', 600: '#059669', 700: '#047857', 900: '#064e3b' },
    teal:    { 50: '#f0fdfa', 100: '#ccfbf1', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 900: '#134e4a' },
    
    // GAMA FRÍA (Información, Sistema, Neutral)
    cyan:    { 50: '#ecfeff', 100: '#cffafe', 400: '#67e8f9', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 900: '#164e63' },
    sky:     { 50: '#f0f9ff', 100: '#e0f2fe', 400: '#7dd3fc', 500: '#38bdf8', 600: '#0ea5e9', 700: '#0284c7', 900: '#0c4a6e' },
    blue:    { 50: '#eff6ff', 100: '#dbeafe', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' },
    indigo:  { 50: '#eef2ff', 100: '#e0e7ff', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 900: '#312e81' },
    
    // GAMA CREATIVA (Distinción, Roles especiales)
    violet:  { 50: '#f5f3ff', 100: '#ede9fe', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 900: '#4c1d95' },
    purple:  { 50: '#faf5ff', 100: '#f3e8ff', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 900: '#581c87' },
    fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 900: '#701a75' },
    pink:    { 50: '#fdf2f8', 100: '#fce7f3', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 900: '#831843' },
    rose:    { 50: '#fff1f2', 100: '#ffe4e6', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 900: '#881337' },
};

// Mapeo para clases de Tailwind (bg-*, text-*, border-*)
export const statusColorPalette: { [key: string]: { main: string; bgText: string; border: string; lightBorder: string; pastel: string; } } = {
    slate:   { main: 'bg-slate-500',   bgText: 'bg-slate-300 text-slate-900',   border: 'border-slate-500',   lightBorder: 'border-slate-200', pastel: 'bg-slate-100 text-slate-800' },
    
    red:     { main: 'bg-red-500',     bgText: 'bg-red-300 text-red-900',       border: 'border-red-500',     lightBorder: 'border-red-200',   pastel: 'bg-red-100 text-red-800' },
    orange:  { main: 'bg-orange-500',  bgText: 'bg-orange-300 text-orange-900', border: 'border-orange-500',  lightBorder: 'border-orange-200', pastel: 'bg-orange-100 text-orange-800' },
    amber:   { main: 'bg-amber-500',   bgText: 'bg-amber-300 text-amber-900',   border: 'border-amber-500',   lightBorder: 'border-amber-200',  pastel: 'bg-amber-100 text-amber-800' },
    yellow:  { main: 'bg-yellow-500',  bgText: 'bg-yellow-300 text-yellow-900', border: 'border-yellow-500',  lightBorder: 'border-yellow-200', pastel: 'bg-yellow-100 text-yellow-800' },
    
    lime:    { main: 'bg-lime-500',    bgText: 'bg-lime-300 text-lime-900',     border: 'border-lime-500',     lightBorder: 'border-lime-200',   pastel: 'bg-lime-100 text-lime-800' },
    green:   { main: 'bg-green-500',   bgText: 'bg-green-300 text-green-900',   border: 'border-green-500',   lightBorder: 'border-green-200',  pastel: 'bg-green-100 text-green-800' },
    emerald: { main: 'bg-emerald-500', bgText: 'bg-emerald-300 text-emerald-900', border: 'border-emerald-500', lightBorder: 'border-emerald-200', pastel: 'bg-emerald-100 text-emerald-800' },
    teal:    { main: 'bg-teal-500',    bgText: 'bg-teal-300 text-teal-900',     border: 'border-teal-500',    lightBorder: 'border-teal-200',   pastel: 'bg-teal-100 text-teal-800' },
    
    cyan:    { main: 'bg-cyan-500',    bgText: 'bg-cyan-300 text-cyan-900',     border: 'border-cyan-500',     lightBorder: 'border-cyan-200',   pastel: 'bg-cyan-100 text-cyan-800' },
    sky:     { main: 'bg-sky-500',     bgText: 'bg-sky-300 text-sky-900',       border: 'border-sky-500',     lightBorder: 'border-sky-200',    pastel: 'bg-sky-100 text-sky-800' },
    blue:    { main: 'bg-blue-500',    bgText: 'bg-blue-300 text-blue-900',     border: 'border-blue-500',     lightBorder: 'border-blue-200',   pastel: 'bg-blue-100 text-blue-800' },
    indigo:  { main: 'bg-indigo-500',  bgText: 'bg-indigo-300 text-indigo-900', border: 'border-indigo-500',  lightBorder: 'border-indigo-200',  pastel: 'bg-indigo-100 text-indigo-800' },
    
    violet:  { main: 'bg-violet-500',  bgText: 'bg-violet-300 text-violet-900', border: 'border-violet-500',  lightBorder: 'border-violet-200',  pastel: 'bg-violet-100 text-violet-800' },
    purple:  { main: 'bg-purple-500',  bgText: 'bg-purple-300 text-purple-900', border: 'border-purple-500',  lightBorder: 'border-purple-200',  pastel: 'bg-purple-100 text-purple-800' },
    fuchsia: { main: 'bg-fuchsia-500', bgText: 'bg-fuchsia-300 text-fuchsia-900', border: 'border-fuchsia-500', lightBorder: 'border-fuchsia-200', pastel: 'bg-fuchsia-100 text-fuchsia-800' },
    pink:    { main: 'bg-pink-500',    bgText: 'bg-pink-300 text-pink-900',     border: 'border-pink-500',    lightBorder: 'border-pink-200',    pastel: 'bg-pink-100 text-pink-800' },
    rose:    { main: 'bg-rose-500',    bgText: 'bg-rose-300 text-rose-900',     border: 'border-rose-500',     lightBorder: 'border-rose-200',   pastel: 'bg-rose-100 text-rose-800' }
};