// CONTROL-DE-ASISTENCIA/src/services/deviceService.ts
import { API_BASE_URL } from '../config/api';
import { Device, Zone } from '../types';


const getAuthHeaders = () => {
    const sessionStr = localStorage.getItem('app_session');
    const token = sessionStr ? JSON.parse(sessionStr).token : '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const deviceService = {
    getAll: async (): Promise<Device[]> => {
        const response = await fetch(`${API_BASE_URL}/devices`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Error al obtener dispositivos');
        return await response.json();
    },

    getZones: async (): Promise<Zone[]> => {
        const response = await fetch(`${API_BASE_URL}/devices/zones`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Error al obtener zonas');
        return await response.json();
    },

    create: async (device: Partial<Device>) => {
        const response = await fetch(`${API_BASE_URL}/devices`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(device)
        });
        if (!response.ok) throw new Error('Error al crear dispositivo');
        return await response.json();
    },

    update: async (id: number, device: Partial<Device>) => {
        const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(device)
        });
        if (!response.ok) throw new Error('Error al actualizar dispositivo');
        return await response.json();
    },

    downloadLogs: async (id: number) => {
        const response = await fetch(`${API_BASE_URL}/devices/${id}/sync`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al descargar checadas');
        }
        return await response.json();
    },

    syncEmployees: async (id: number) => {
        // Simulación por ahora
        return new Promise(resolve => setTimeout(resolve, 2000));
    },

    testConnection: async (id: number) => {
        const response = await fetch(`${API_BASE_URL}/devices/${id}/test-connection`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error de conexión');
        }
        return await response.json();
    },

    // --- EL MÉTODO QUE ESTABA POSIBLEMENTE FALTANDO O MAL DEFINIDO ---
    diagnose: async (id: number) => {
        const response = await fetch(`${API_BASE_URL}/devices/${id}/diagnose`, {
            method: 'GET', // Es GET, no POST
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Error en diagnóstico');
        return await response.json();
    },
    captureImage: async (id: number) => {
        // Hacemos POST al endpoint que crearemos en el backend
        const response = await fetch(`${API_BASE_URL}/devices/${id}/snapshots`, {
            method: 'GET',
            headers: getAuthHeaders()
        })
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al capturar imagen');
        }
        return await response.json();
    
    },
    getConfigInterval: async (): Promise<number> => { return 0; },
    setConfigInterval: async (minutes: number) => { console.log(minutes); }

    
};