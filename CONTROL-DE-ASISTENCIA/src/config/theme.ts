// src/config/theme.ts
export const themes: { [key: string]: { [key: number]: string } } = {
    indigo: { 50: '#eef2ff', 100: '#e0e7ff', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 900: '#312e81' },
    sky:    { 50: '#f0f9ff', 100: '#e0f2fe', 400: '#7dd3fc', 500: '#38bdf8', 600: '#0ea5e9', 700: '#0284c7', 900: '#0c4a6e' },
    cyan:   { 50: '#ecfeff', 100: '#cffafe', 400: '#67e8f9', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 900: '#164e63' },
    emerald:{ 50: '#ecfdf5', 100: '#d1fae5', 400: '#6ee7b7', 500: '#10b981', 600: '#059669', 700: '#047857', 900: '#064e3b' },
    lime:   { 50: '#f7fee7', 100: '#ecfccb', 400: '#bef264', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 900: '#365314' },
    orange: { 50: '#fff7ed', 100: '#ffedd5', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 900: '#7c2d12' },
    rose:   { 50: '#fff1f2', 100: '#ffe4e6', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 900: '#881337' },
    slate:  { 50: '#f8fafc', 100: '#f1f5f9', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 900: '#0f172a' },
};

export const statusColorPalette: { [key: string]: { main: string; bgText: string; border: string; lightBorder: string; } } = {
    slate:   { main: 'bg-slate-500',   bgText: 'bg-slate-300 text-slate-900',   border: 'border-slate-500',   lightBorder: 'border-slate-200' },
    red:     { main: 'bg-red-500',     bgText: 'bg-red-300 text-red-900',       border: 'border-red-500',     lightBorder: 'border-red-200' },
    orange:  { main: 'bg-orange-500',  bgText: 'bg-orange-300 text-orange-900', border: 'border-orange-500',  lightBorder: 'border-orange-200' },
    amber:   { main: 'bg-amber-500',   bgText: 'bg-amber-300 text-amber-900',   border: 'border-amber-500',   lightBorder: 'border-amber-200' },
    yellow:  { main: 'bg-yellow-500',  bgText: 'bg-yellow-300 text-yellow-900', border: 'border-yellow-500',  lightBorder: 'border-yellow-200' },
    lime:    { main: 'bg-lime-500',    bgText: 'bg-lime-300 text-lime-900',     border: 'border-lime-500',     lightBorder: 'border-lime-200' },
    green:   { main: 'bg-green-500',   bgText: 'bg-green-300 text-green-900',   border: 'border-green-500',   lightBorder: 'border-green-300' },
    emerald: { main: 'bg-emerald-500', bgText: 'bg-emerald-300 text-emerald-900', border: 'border-emerald-500', lightBorder: 'border-emerald-200' },
    cyan:    { main: 'bg-cyan-500',    bgText: 'bg-cyan-300 text-cyan-900',     border: 'border-cyan-500',     lightBorder: 'border-cyan-200' },
    sky:     { main: 'bg-sky-500',     bgText: 'bg-sky-300 text-sky-900',       border: 'border-sky-500',     lightBorder: 'border-sky-200' },
    blue:    { main: 'bg-blue-500',    bgText: 'bg-blue-300 text-blue-900',     border: 'border-blue-500',     lightBorder: 'border-blue-200' },
    indigo:  { main: 'bg-indigo-500',  bgText: 'bg-indigo-300 text-indigo-900', border: 'border-indigo-500',  lightBorder: 'border-indigo-200' },
    purple:  { main: 'bg-purple-500',  bgText: 'bg-purple-300 text-purple-900', border: 'border-purple-500',  lightBorder: 'border-purple-200' },
    rose:    { main: 'bg-rose-500',    bgText: 'bg-rose-300 text-rose-900',     border: 'border-rose-500',     lightBorder: 'border-rose-200' }
};

export const statusColorPalette2: { [key: string]: { main: string; bgText: string; border: string; lightBorder: string; } } = {
    slate:   { main: 'bg-slate-500',   bgText: 'bg-slate-400 text-slate-900',   border: 'border-slate-600',   lightBorder: 'border-slate-200' },
    red:     { main: 'bg-red-500',     bgText: 'bg-red-400 text-red-900',       border: 'border-red-600',     lightBorder: 'border-red-200' },
    orange:  { main: 'bg-orange-500',  bgText: 'bg-orange-400 text-orange-900', border: 'border-orange-600',  lightBorder: 'border-orange-200' },
    amber:   { main: 'bg-amber-500',   bgText: 'bg-amber-400 text-amber-900',   border: 'border-amber-600',   lightBorder: 'border-amber-200' },
    yellow:  { main: 'bg-yellow-500',  bgText: 'bg-yellow-400 text-yellow-900', border: 'border-yellow-600',  lightBorder: 'border-yellow-200' },
    lime:    { main: 'bg-lime-500',    bgText: 'bg-lime-400 text-lime-900',     border: 'border-lime-600',     lightBorder: 'border-lime-400' },
    green:   { main: 'bg-green-500',   bgText: 'bg-green-400 text-green-900',   border: 'border-green-600',   lightBorder: 'border-green-400' },
    emerald: { main: 'bg-emerald-500', bgText: 'bg-emerald-400 text-emerald-900', border: 'border-emerald-600', lightBorder: 'border-emerald-400' },
    cyan:    { main: 'bg-cyan-500',    bgText: 'bg-cyan-400 text-cyan-900',     border: 'border-cyan-600',     lightBorder: 'border-cyan-400' },
    sky:     { main: 'bg-sky-500',     bgText: 'bg-sky-400 text-sky-900',       border: 'border-sky-600',     lightBorder: 'border-sky-400' },
    blue:    { main: 'bg-blue-500',    bgText: 'bg-blue-400 text-blue-100',     border: 'border-blue-600',     lightBorder: 'border-blue-400' },
    indigo:  { main: 'bg-indigo-500',  bgText: 'bg-indigo-400 text-indigo-100', border: 'border-indigo-600',  lightBorder: 'border-indigo-400' },
    purple:  { main: 'bg-purple-500',  bgText: 'bg-purple-400 text-purple-100', border: 'border-purple-600',  lightBorder: 'border-purple-400' },
    rose:    { main: 'bg-rose-500',    bgText: 'bg-rose-400 text-rose-100',     border: 'border-rose-600',     lightBorder: 'border-rose-400' }
};

export const statusColorPalette_OLD: { [key: string]: { main: string; bgText: string; border: string; lightBorder: string; } } = {
    slate:   { main: 'bg-slate-500',   bgText: 'bg-slate-200 text-slate-900',   border: 'border-slate-500',   lightBorder: 'border-slate-200' },
    red:     { main: 'bg-red-500',     bgText: 'bg-red-200 text-red-900',       border: 'border-red-500',     lightBorder: 'border-red-200' },
    orange:  { main: 'bg-orange-500',  bgText: 'bg-orange-200 text-orange-900', border: 'border-orange-500',  lightBorder: 'border-orange-200' },
    amber:   { main: 'bg-amber-500',   bgText: 'bg-amber-200 text-amber-900',   border: 'border-amber-500',   lightBorder: 'border-amber-200' },
    yellow:  { main: 'bg-yellow-500',  bgText: 'bg-yellow-200 text-yellow-900', border: 'border-yellow-500',  lightBorder: 'border-yellow-200' },
    lime:    { main: 'bg-lime-500',    bgText: 'bg-lime-200 text-lime-900',     border: 'border-lime-500',     lightBorder: 'border-lime-200' },
    green:   { main: 'bg-green-500',   bgText: 'bg-green-200 text-green-900',   border: 'border-green-500',   lightBorder: 'border-green-200' },
    emerald: { main: 'bg-emerald-500', bgText: 'bg-emerald-200 text-emerald-900', border: 'border-emerald-500', lightBorder: 'border-emerald-200' },
    cyan:    { main: 'bg-cyan-500',    bgText: 'bg-cyan-200 text-cyan-900',     border: 'border-cyan-500',     lightBorder: 'border-cyan-200' },
    sky:     { main: 'bg-sky-500',     bgText: 'bg-sky-200 text-sky-900',       border: 'border-sky-500',     lightBorder: 'border-sky-200' },
    blue:    { main: 'bg-blue-500',    bgText: 'bg-blue-200 text-blue-900',     border: 'border-blue-500',     lightBorder: 'border-blue-200' },
    indigo:  { main: 'bg-indigo-500',  bgText: 'bg-indigo-200 text-indigo-900', border: 'border-indigo-500',  lightBorder: 'border-indigo-400' },
    purple:  { main: 'bg-purple-500',  bgText: 'bg-purple-200 text-purple-900', border: 'border-purple-500',  lightBorder: 'border-purple-400' },
    rose:    { main: 'bg-rose-500',    bgText: 'bg-rose-200 text-rose-900',     border: 'border-rose-500',     lightBorder: 'border-rose-400' }
};

