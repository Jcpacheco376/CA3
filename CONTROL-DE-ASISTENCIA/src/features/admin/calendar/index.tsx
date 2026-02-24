import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { CalendarEvent, EventType, FilterGroup, CatalogItem, DimensionFilter, EmployeeBirthday, EmployeeAnniversary } from './types';
import { DIMENSIONS, toDateKey, parseDateKey } from './utils';
import { CalendarGrid } from './CalendarGrid';
import { DayDetailPanel } from './DayDetailPanel';
import { AnnualOverview } from './AnnualOverview';
import { EventEditorModal } from './EventEditorModal';
import { ImportHolidaysModal } from './ImportHolidaysModal';

import { API_BASE_URL } from '../../../config/api';

export const CalendarEventsPage = () => {
    const { getToken, user } = useAuth();
    const { addNotification } = useNotification();

    // ── Resizable panels ────────────────────────────────────────────────────
    const [panoramaHeight, setPanoramaHeight] = useState<number>(() =>
        parseInt(localStorage.getItem('cal-panorama-h') || '160'));
    const [detailWidth, setDetailWidth] = useState<number>(() =>
        parseInt(localStorage.getItem('cal-detail-w') || '260'));

    useEffect(() => { localStorage.setItem('cal-panorama-h', String(panoramaHeight)); }, [panoramaHeight]);
    useEffect(() => { localStorage.setItem('cal-detail-w', String(detailWidth)); }, [detailWidth]);

    const startPanoramaResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const startH = panoramaHeight;
        const onMove = (ev: MouseEvent) => {
            const newH = Math.max(90, Math.min(340, startH + (startY - ev.clientY)));
            setPanoramaHeight(newH);
        };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [panoramaHeight]);

    const startDetailResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = detailWidth;
        const onMove = (ev: MouseEvent) => {
            const newW = Math.max(160, Math.min(480, startW + (startX - ev.clientX)));
            setDetailWidth(newW);
        };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, [detailWidth]);
    // ────────────────────────────────────────────────────────────────────────

    const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
        const token = getToken();
        const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };
        if (options.body && typeof options.body === 'string') headers['Content-Type'] = 'application/json';
        return fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers: { ...headers, ...options.headers } });
    }, [getToken]);

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [catalogs, setCatalogs] = useState<Record<string, CatalogItem[]>>({});
    const [birthdays, setBirthdays] = useState<EmployeeBirthday[]>([]);
    const [anniversaries, setAnniversaries] = useState<EmployeeAnniversary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const today = new Date();
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [yearTimelineYear, setYearTimelineYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(toDateKey(today));

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    // Form Data
    const [formData, setFormData] = useState({
        Fecha: toDateKey(today),
        Nombre: '',
        Descripcion: '',
        TipoEventoId: '',
        AplicaATodos: true,
    });
    const [formFilterGroups, setFormFilterGroups] = useState<FilterGroup[]>([{ id: 'g1', filters: [] }]);

    // Employee Count logic
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [matchingCount, setMatchingCount] = useState<{ total: number | null, byGroup: number[] }>({ total: null, byGroup: [] });
    const [isCountLoading, setIsCountLoading] = useState(false);

    // Import Modal
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importYear, setImportYear] = useState(today.getFullYear());
    const [importTypeId, setImportTypeId] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const handleEventTypeChange = (newEventTypeId: string) => {
        const selectedType = eventTypes.find(t => t.TipoEventoId === newEventTypeId);
        const forceFilters = selectedType ? !selectedType.esGeneral : false;

        setFormData(prev => ({ ...prev, TipoEventoId: newEventTypeId, AplicaATodos: !forceFilters }));

        if (forceFilters) {
            const filters: DimensionFilter[] = [];
            for (const dim of DIMENSIONS) {
                const catalogItems = catalogs[dim.key] || [];
                const getPermittedIds = (dimKey: string): any[] => {
                    const data =
                        dimKey === 'DEPARTAMENTO' ? user?.Departamentos :
                            dimKey === 'GRUPO_NOMINA' ? user?.GruposNomina :
                                dimKey === 'PUESTO' ? user?.Puestos :
                                    dimKey === 'ESTABLECIMIENTO' ? user?.Establecimientos : [];

                    if (!data) return [];
                    return data.map((item: any) => {
                        if (typeof item === 'object') {
                            return item.DepartamentoId || item.GrupoNominaId || item.PuestoId || item.EstablecimientoId;
                        }
                        return item;
                    });
                };

                const userPermitted = getPermittedIds(dim.key);

                if (userPermitted.length > 0) {
                    filters.push({
                        dimension: dim.key,
                        valores: userPermitted
                    });
                }
            }
            setFormFilterGroups([{ id: 'g1', filters: filters }]);
        } else {
            // When switching to a non-restrictive type, reset filters.
            setFormFilterGroups([{ id: 'g1', filters: [] }]);
        }
    };

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [evRes, typRes] = await Promise.all([
                fetchWithAuth('/calendar-events'),
                fetchWithAuth('/calendar-events/types')
            ]);
            if (evRes.ok) setEvents(await evRes.json());
            if (typRes.ok) {
                const types = await typRes.json();
                setEventTypes(types);
                if (types.length > 0) setImportTypeId(types[0].TipoEventoId);
            }
            const catalogPromises = DIMENSIONS.map(d =>
                fetchWithAuth(d.endpoint)
                    .then(r => (r.ok ? r.json() : []))
                    .then(data => ({
                        key: d.key,
                        items: data.map((item: any) => ({ id: item[d.idField], nombre: item[d.nameField] }))
                    }))
            );
            const resolvedCatalogs = await Promise.all(catalogPromises);
            const newCats = resolvedCatalogs.reduce((acc, cat) => {
                acc[cat.key] = cat.items;
                return acc;
            }, {} as Record<string, CatalogItem[]>);
            setCatalogs(newCats);
        } catch (error) {
            addNotification('Error', 'Error al cargar datos del calendario', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Fetch birthdays dynamically based on viewMonth
    useEffect(() => {
        const fetchBirthdays = async () => {
            const m = viewMonth + 1; // JS months are 0-11, DB expects 1-12
            const prevM = m === 1 ? 12 : m - 1;
            const nextM = m === 12 ? 1 : m + 1;
            try {
                const res = await fetchWithAuth(`/employees/birthdays?months=${prevM},${m},${nextM}`);
                if (res.ok) {
                    const data = await res.json();
                    setBirthdays(data);
                }
            } catch (error) {
                console.error('Error fetching birthdays', error);
            }
        };
        fetchBirthdays();
    }, [viewMonth, fetchWithAuth]);

    // Fetch anniversaries dynamically based on viewMonth
    useEffect(() => {
        const fetchAnniversaries = async () => {
            const m = viewMonth + 1;
            const prevM = m === 1 ? 12 : m - 1;
            const nextM = m === 12 ? 1 : m + 1;
            try {
                const res = await fetchWithAuth(`/employees/anniversaries?months=${prevM},${m},${nextM}`);
                if (res.ok) {
                    const data = await res.json();
                    setAnniversaries(data);
                }
            } catch (error) {
                console.error('Error fetching anniversaries', error);
            }
        };
        fetchAnniversaries();
    }, [viewMonth, fetchWithAuth]);

    // Derived calendar setup
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1));
    const endDate = new Date(lastDay);
    if (endDate.getDay() !== 0) endDate.setDate(endDate.getDate() + (7 - endDate.getDay()));

    const calendarDays: { date: Date; inMonth: boolean }[] = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
        calendarDays.push({ date: new Date(curr), inMonth: curr.getMonth() === viewMonth });
        curr.setDate(curr.getDate() + 1);
    }

    const eventsByDate = useMemo(() => {
        const dict: Record<string, CalendarEvent[]> = {};
        events.forEach(ev => {
            const k = ev.Fecha.split('T')[0];
            if (!dict[k]) dict[k] = [];
            dict[k].push(ev);
        });
        return dict;
    }, [events]);

    const getEffectiveFilters = useCallback((groupFilters: any[]) => {
        const effective = [...groupFilters];
        for (const dim of DIMENSIONS) {
            const items = catalogs[dim.key] || [];
            if (items.length === 1) {
                const singleId = items[0].id;
                const existing = effective.find(f => f.dimension === dim.key);
                if (!existing) effective.push({ dimension: dim.key, valores: [singleId] });
                else if (!existing.valores.includes(singleId)) existing.valores = [...existing.valores, singleId];
            }
        }
        return effective;
    }, [catalogs]);

    const calculateEmployeeMatch = useCallback(async (aplicaTodos: boolean, groups: FilterGroup[]) => {
        if (aplicaTodos) {
            try {
                if (totalCount === null) {
                    const res = await fetchWithAuth('/calendar-events/count-employees', { method: 'POST', body: JSON.stringify({ filters: [] }) });
                    if (res.ok) { const data = await res.json(); setTotalCount(data.total); setMatchingCount({ total: data.total, byGroup: [] }); }
                } else setMatchingCount({ total: totalCount, byGroup: [] });
            } catch (error) { console.error('Error counting total', error); }
            return;
        }

        setIsCountLoading(true);
        try {
            if (totalCount === null) {
                const tr = await fetchWithAuth('/calendar-events/count-employees', { method: 'POST', body: JSON.stringify({ filters: [] }) });
                if (tr.ok) setTotalCount((await tr.json()).total);
            }
            const allFilters = groups.map(g => getEffectiveFilters(g.filters));
            const cr = await fetchWithAuth('/calendar-events/count-employees', {
                method: 'POST',
                body: JSON.stringify({ filterGroups: allFilters, aplicaATodos: false })
            });
            if (cr.ok) {
                const data = await cr.json();
                setMatchingCount({ total: data.total, byGroup: data.byGroup || [] });
            }
        } catch (error) { addNotification('Error', "Error al calcular empleados afectados", 'error'); }
        finally { setIsCountLoading(false); }
    }, [fetchWithAuth, totalCount, getEffectiveFilters]);

    useEffect(() => {
        if (!isModalOpen) return;
        const delayBounceFn = setTimeout(() => { calculateEmployeeMatch(formData.AplicaATodos, formFilterGroups); }, 600);
        return () => clearTimeout(delayBounceFn);
    }, [formData.AplicaATodos, formFilterGroups, isModalOpen, calculateEmployeeMatch]);

    // Handlers
    const setScopeMode = (aplicaATodos: boolean) => setFormData(p => ({ ...p, AplicaATodos: aplicaATodos }));
    const addGroup = () => setFormFilterGroups(g => [...g, { id: Math.random().toString(36).substr(2, 9), filters: [] }]);
    const removeGroup = (id: string) => setFormFilterGroups(g => g.filter(x => x.id !== id));

    const toggleFilterValue = (groupId: string, dimension: string, valorId: number) => {
        setFormFilterGroups(prev => prev.map(group => {
            if (group.id !== groupId) return group;
            const existingFilter = group.filters.find(f => f.dimension === dimension);
            if (!existingFilter) return { ...group, filters: [...group.filters, { dimension, valores: [valorId] }] };
            const newValores = existingFilter.valores.includes(valorId) ? existingFilter.valores.filter(v => v !== valorId) : [...existingFilter.valores, valorId];
            return {
                ...group,
                filters: newValores.length === 0 ? group.filters.filter(f => f.dimension !== dimension)
                    : group.filters.map(f => f.dimension === dimension ? { ...f, valores: newValores } : f)
            };
        }));
    };

    const clearDimension = (groupId: string, dimension: string) => {
        setFormFilterGroups(prev => prev.map(group => group.id === groupId ? { ...group, filters: group.filters.filter(f => f.dimension !== dimension) } : group));
    };

    const openCreateModal = (dateStr?: string) => {
        setEditingEvent(null);
        const initialDate = dateStr || selectedDate || toDateKey(today);
        const initialType = eventTypes.length > 0 ? eventTypes[0].TipoEventoId : '';

        const selectedType = eventTypes.find(t => t.TipoEventoId === initialType);
        const forceFilters = selectedType ? !selectedType.esGeneral : false;

        setFormData({
            Fecha: initialDate,
            Nombre: '',
            Descripcion: '',
            TipoEventoId: initialType,
            AplicaATodos: !forceFilters
        });

        if (forceFilters) {
            const filters: DimensionFilter[] = [];
            for (const dim of DIMENSIONS) {
                const getPermittedIds = (dimKey: string): any[] => {
                    const data =
                        dimKey === 'DEPARTAMENTO' ? user?.Departamentos :
                            dimKey === 'GRUPO_NOMINA' ? user?.GruposNomina :
                                dimKey === 'PUESTO' ? user?.Puestos :
                                    dimKey === 'ESTABLECIMIENTO' ? user?.Establecimientos : [];

                    if (!data) return [];
                    return data.map((item: any) => {
                        if (typeof item === 'object') {
                            return item.DepartamentoId || item.GrupoNominaId || item.PuestoId || item.EstablecimientoId;
                        }
                        return item;
                    });
                };

                const userPermittedIds = getPermittedIds(dim.key);
                if (userPermittedIds.length > 0) {
                    filters.push({
                        dimension: dim.key,
                        valores: userPermittedIds
                    });
                }
            }
            setFormFilterGroups([{ id: 'g1', filters: filters }]);
        } else {
            setFormFilterGroups([{ id: 'g1', filters: [] }]);
        }

        setIsModalOpen(true);
    };

    const openEditModal = (ev: CalendarEvent) => {
        setEditingEvent(ev);
        const eventType = eventTypes.find(t => t.TipoEventoId === ev.TipoEventoId);
        const isRestrictive = eventType ? !eventType.esGeneral : false;

        setFormData({ Fecha: ev.Fecha.split('T')[0], Nombre: ev.Nombre, Descripcion: ev.Descripcion || '', TipoEventoId: ev.TipoEventoId, AplicaATodos: ev.AplicaATodos });

        if (isRestrictive) {
            // If the type is restrictive, let the handler set the filters from the user's role
            handleEventTypeChange(ev.TipoEventoId);
        } else if (ev.AplicaATodos || ev.Filtros.length === 0) {
            setFormFilterGroups([{ id: 'g1', filters: [] }]);
        } else {
            const groupMap: Record<number, DimensionFilter[]> = {};
            ev.Filtros.forEach(f => {
                const g = f.grupoRegla || 0;
                if (!groupMap[g]) groupMap[g] = [];
                const dimFilter = groupMap[g].find(df => df.dimension === f.dimension);
                if (dimFilter) dimFilter.valores.push(f.valorId);
                else groupMap[g].push({ dimension: f.dimension, valores: [f.valorId] });
            });
            const loadedGroups = Object.keys(groupMap).map(k => ({ id: Math.random().toString(36).substr(2, 9), filters: groupMap[Number(k)] }));
            setFormFilterGroups(loadedGroups.length > 0 ? loadedGroups : [{ id: 'g1', filters: [] }]);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isUpdate = !!editingEvent;

            // Flatten filters: transform array of groups -> flat array with grupoRegla
            // Original: [ { filters: [{dim, vals}, ...] }, ... ]
            // Payload: [ { grupoRegla: index, dimension, valores }, ... ]
            let finalFilters = null;
            if (!formData.AplicaATodos) {
                const flattened: any[] = [];
                formFilterGroups.forEach((group, groupIdx) => {
                    const groupEffective = getEffectiveFilters(group.filters);
                    groupEffective.forEach((f: any) => {
                        flattened.push({
                            grupoRegla: groupIdx,
                            dimension: f.dimension,
                            valores: f.valores
                        });
                    });
                });
                finalFilters = flattened;
            }

            const payload = {
                eventoId: isUpdate ? editingEvent.EventoId : undefined,
                fecha: formData.Fecha,
                nombre: formData.Nombre,
                descripcion: formData.Descripcion,
                tipoEventoId: formData.TipoEventoId,
                aplicaATodos: formData.AplicaATodos,
                filtros: finalFilters
            };

            const response = await fetchWithAuth('/calendar-events', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(await response.text());
            addNotification('Éxito', isUpdate ? 'Evento actualizado' : 'Evento creado', 'success');
            fetchData();
            setIsModalOpen(false);
        } catch (error: any) {
            addNotification('Error', error.message || 'Error al guardar el evento', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetchWithAuth(`/calendar-events/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error al eliminar');
            addNotification('Éxito', 'Evento eliminado', 'success');
            fetchData();
        } catch (error) { addNotification('Error', 'Error al eliminar el evento', 'error'); }
    };

    const handleImportHolidays = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!importTypeId) { addNotification('Aviso', "Selecciona un tipo de evento para los feriados.", 'warning'); return; }
        try {
            setIsImporting(true);
            const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${importYear}/MX`);
            if (!response.ok) throw new Error("No se pudo obtener la lista de feriados.");
            const holidays: any[] = await response.json();
            const newHolidays = holidays.filter(h => !events.some(ev => ev.Fecha.startsWith(h.date)));

            if (newHolidays.length === 0) {
                addNotification('Información', `Todos los festivos de ${importYear} ya están registrados.`, 'info');
                setIsImportModalOpen(false);
                return;
            }

            let successCount = 0;
            await Promise.all(newHolidays.map(async h => {
                const res = await fetchWithAuth('/calendar-events', {
                    method: 'POST',
                    body: JSON.stringify({ fecha: h.date, nombre: h.localName, descripcion: h.name, tipoEventoId: importTypeId, aplicaATodos: true, filtros: null })
                });
                if (res.ok) successCount++;
            }));

            addNotification('Éxito', `Se importaron ${successCount} festivos exitosamente.`, 'success');
            fetchData();
            setIsImportModalOpen(false);
        } catch (error: any) { addNotification('Error', error.message || 'Error al importar festivos.', 'error'); }
        finally { setIsImporting(false); }
    };

    const yearEvents = events.filter(ev => ev.Fecha.startsWith(yearTimelineYear.toString()));
    const yearMonthGroups = useMemo(() => {
        const groups: Record<number, CalendarEvent[]> = {};
        yearEvents.forEach(ev => {
            const m = parseInt(ev.Fecha.split('-')[1], 10) - 1;
            if (!groups[m]) groups[m] = [];
            groups[m].push(ev);
        });
        return groups;
    }, [yearEvents]);

    const birthdaysByMonth = useMemo(() => {
        const counts: Record<number, number> = {};
        birthdays.forEach(b => {
            const m = b.MesNacimiento - 1; // 0-based month index
            counts[m] = (counts[m] || 0) + 1;
        });
        return counts;
    }, [birthdays]);

    if (isLoading) {
        return <div className="p-6 text-center text-slate-500">Cargando calendario...</div>;
    }

    return (
        <div className="px-3 pt-3 pb-2 w-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 128px)' }}>
            <div className="mb-2">
                <h2 className="text-xl font-bold text-slate-800 leading-none">Eventos y Días Especiales</h2>
                <p className="text-slate-400 text-xs mt-0.5">Configura días feriados y eventos que afectan la asistencia general.</p>
            </div>

            <div className="flex gap-4 flex-1 min-h-0 mb-2">
                <CalendarGrid
                    viewMonth={viewMonth} viewYear={viewYear} todayKey={toDateKey(today)}
                    selectedDate={selectedDate} calendarDays={calendarDays} eventsByDate={eventsByDate}
                    birthdays={birthdays}
                    anniversaries={anniversaries}
                    prevMonth={() => { setViewMonth(m => m === 0 ? 11 : m - 1); setViewYear(y => viewMonth === 0 ? y - 1 : y); }}
                    nextMonth={() => { setViewMonth(m => m === 11 ? 0 : m + 1); setViewYear(y => viewMonth === 11 ? y + 1 : y); }}
                    goToToday={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); setSelectedDate(toDateKey(today)); }}
                    handleDayClick={(d, m) => { setSelectedDate(d); if (!m) { const target = parseDateKey(d); setViewMonth(target.getMonth()); setViewYear(target.getFullYear()); } }}
                    openCreateModal={openCreateModal} openEditModal={openEditModal}
                />
                {/* Detail panel resize handle */}
                <div
                    onMouseDown={startDetailResize}
                    className="w-1.5 cursor-col-resize flex items-center justify-center group shrink-0 self-stretch rounded hover:bg-[--theme-100] transition-colors"
                    title="Arrastrar para redimensionar"
                >
                    <div className="w-0.5 h-8 rounded-full bg-slate-300 group-hover:bg-[--theme-400] transition-colors" />
                </div>
                <DayDetailPanel
                    selectedDate={selectedDate} selectedDayEvents={selectedDate ? (eventsByDate[selectedDate] || []) : []}
                    openCreateModal={openCreateModal} openEditModal={openEditModal} handleDelete={handleDelete}
                    birthdays={birthdays}
                    anniversaries={anniversaries}
                    style={{ width: detailWidth, minWidth: detailWidth, maxWidth: detailWidth }}
                />
            </div>

            {/* Panorama resize handle */}
            <div
                onMouseDown={startPanoramaResize}
                className="h-2 cursor-row-resize flex items-center justify-center group shrink-0"
                title="Arrastrar para redimensionar panorama"
            >
                <div className="w-20 h-1 rounded-full bg-slate-200 group-hover:bg-[--theme-400] transition-colors" />
            </div>
            <div style={{ height: panoramaHeight }} className="shrink-0 overflow-hidden flex flex-col">

                <AnnualOverview
                    yearTimelineYear={yearTimelineYear} setYearTimelineYear={setYearTimelineYear}
                    yearEvents={yearEvents} yearMonthGroups={yearMonthGroups}
                    setViewMonth={setViewMonth} setViewYear={setViewYear} today={today}
                    birthdaysByMonth={birthdaysByMonth}
                    onImport={() => { setImportYear(yearTimelineYear); setImportTypeId(''); setIsImportModalOpen(true); }}
                />
            </div>

            <EventEditorModal
                isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                editingEvent={editingEvent} eventTypes={eventTypes}
                formData={formData} setFormData={setFormData}
                onEventTypeChange={handleEventTypeChange}
                formFilterGroups={formFilterGroups} setScopeMode={setScopeMode}
                catalogs={catalogs} toggleFilterValue={toggleFilterValue} clearDimension={clearDimension}
                addGroup={addGroup} removeGroup={removeGroup}
                isCountLoading={isCountLoading} matchingCount={matchingCount} totalCount={totalCount}
                handleSubmit={handleSubmit}
                user={user}
            />

            <ImportHolidaysModal
                isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}
                importYear={importYear} setImportYear={setImportYear}
                importTypeId={importTypeId} setImportTypeId={setImportTypeId}
                isImporting={isImporting} handleImportHolidays={handleImportHolidays}
                eventTypes={eventTypes}
            />
        </div>
    );
};
