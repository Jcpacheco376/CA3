// src/types/zkteco-js.d.ts
declare module 'zkteco-js' {
    class ZKLib {
        constructor(ip: string, port: number, timeout: number, inport: number);
        
        createSocket(): Promise<void>;
        disconnect(): Promise<void>;
        
        // Comandos de Datos
        getAttendances(): Promise<{ data: any[] }>;
        getUsers(): Promise<{ data: any[] }>;
        
        // Comandos de Control
        disableDevice(): Promise<any>;
        enableDevice(): Promise<any>;
        
        // --- NUEVOS COMANDOS DE DIAGNÓSTICO ---
        getFirmware(): Promise<string>;
        getSerial(): Promise<string>;
        getPlatform(): Promise<string>;
        getDeviceName(): Promise<string>;
        getTime(): Promise<string>;
        getPIN(): Promise<any>;
        
        commKey?: number; 
    }
    export = ZKLib;
}