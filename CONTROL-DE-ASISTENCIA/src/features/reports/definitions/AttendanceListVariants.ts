// src/features/reports/definitions/AttendanceListVariants.ts
import { BaseReportGenerator } from '../../../utils/report-engine/CoreReportGenerator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import autoTable from 'jspdf-autotable';
import { ReportValidators } from './ReportRules';

// Helpers de formato
const safeDate = (d: string) => {
    const parts = d.substring(0, 10).split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};
const fmtDate = (d: string) => format(safeDate(d), 'dd/MM');
const fmtDay = (d: string) => format(safeDate(d), 'EEEE', { locale: es });
const fmtTime = (t: string | null) => t ? format(new Date(t), 'HH:mm') : '--';

// Función para obtener texto "honesto" (muestra datos crudos si no hay validación)
const getStatusText = (f: any) => {
    // En lista de asistencia, priorizamos el dato crudo del reloj si no hay manual
    if (f.EstatusManualAbrev) return f.EstatusManualAbrev;
    if (f.EstatusChecadorAbrev) return f.EstatusChecadorAbrev; // Dato automático
    
    // Si no hay nada, checamos validación de vacíos
    const validation = ReportValidators.attendanceList(f);
    if (validation.status === 'missing_data') return 'Ausente';
    
    return '-';
};

// === VARIANTE 1: ESTÁNDAR (Operativa) ===
export class AttendanceStandardReport extends BaseReportGenerator {
    public generateContent(data: any[]) {
        this.addHeader();
        let y = 45;

        data.forEach(emp => {
            if (y > 240) { this.doc.addPage(); this.addHeader(); y = 45; }

            // Encabezado simple por empleado
            this.doc.setFontSize(10);
            this.doc.setTextColor(this.theme.text);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(`${emp.nombre} (${emp.codRef})`, 16, y);
            
            // Depto alineado a la derecha
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(emp.departamento || '', 195, y, { align: 'right' });
            
            this.doc.setDrawColor(200);
            this.doc.setLineWidth(0.1);
            this.doc.line(16, y + 2, 195, y + 2);
            y += 5;

            const body = emp.fichas.map((f: any) => [
                fmtDate(f.Fecha), 
                fmtDay(f.Fecha), 
                fmtTime(f.HoraEntrada), 
                fmtTime(f.HoraSalida), 
                f.HorasTrabajadas > 0 ? f.HorasTrabajadas : '-',
                getStatusText(f)
            ]);

            // Usamos drawTable del motor
            y = this.drawTable(
                ['Fecha', 'Día', 'Entrada', 'Salida', 'Estatus'], 
                body, y
            ) + 8;
        });
    }
}

// === VARIANTE 2: FIRMA (Para Auditoría) ===
export class AttendanceSignatureReport extends BaseReportGenerator {
    public generateContent(data: any[]) {
        this.addHeader();
        let y = 45;

        data.forEach(emp => {
            if (y > 230) { this.doc.addPage(); this.addHeader(); y = 45; }

            // Bloque sólido para el nombre (distinción clara)
            this.doc.setFillColor(this.theme.secondary);
            this.doc.rect(16, y, 180, 8, 'F');
            
            this.doc.setFontSize(10);
            this.doc.setTextColor(this.theme.primary);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(emp.nombre, 18, y + 5.5);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(`ID: ${emp.codRef}`, 170, y + 5.5);

            y += 10;

            const body = emp.fichas.map((f: any) => [
                fmtDate(f.Fecha), 
                fmtTime(f.HoraEntrada), 
                fmtTime(f.HoraSalida),
                getStatusText(f),
                '' // Espacio vacío para firma
            ]);

            // Tabla personalizada con columna ancha para firma
            autoTable(this.doc, {
                startY: y,
                head: [['Fecha', 'Entrada', 'Salida', 'Estatus', 'Firma del Empleado']],
                body: body,
                theme: 'grid', // Grid siempre para facilitar la firma
                headStyles: { 
                    fillColor: [255, 255, 255], 
                    textColor: 0, 
                    fontStyle: 'bold',
                    lineWidth: 0.1,
                    lineColor: 0
                },
                styles: { 
                    fontSize: 8, 
                    cellPadding: 3, // Más espacio vertical para firmar
                    textColor: 0,
                    lineColor: 150
                },
                columnStyles: { 
                    0: { cellWidth: 20 },
                    4: { cellWidth: 'auto' } // El resto para la firma
                },
                margin: { left: 16, right: 14 }
            });

            // @ts-ignore
            y = this.doc.lastAutoTable.finalY + 15; // Espacio extra para separar bloques
        });
    }
}

// === VARIANTE 3: COMPACTA (Ahorro) ===
export class AttendanceCompactReport extends BaseReportGenerator {
    public generateContent(data: any[]) {
        this.addHeader();
        let y = 40;

        data.forEach(emp => {
            // Verificación de espacio
            if (y > 260) { this.doc.addPage(); this.addHeader(); y = 40; }

            // Título inline
            this.doc.setFontSize(9);
            this.doc.setTextColor(0);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(`${emp.codRef} - ${emp.nombre}`, 16, y);
            y += 2;

            const body = emp.fichas.map((f: any) => [
                fmtDate(f.Fecha), 
                fmtDay(f.Fecha).substring(0,2), 
                fmtTime(f.HoraEntrada), 
                fmtTime(f.HoraSalida), 
                getStatusText(f)
            ]);

            autoTable(this.doc, {
                startY: y,
                head: [['Fec', 'Día', 'Ent', 'Sal', 'Est']], 
                body: body,
                theme: 'plain',
                headStyles: { fillColor: 220, textColor: 0, fontSize: 7, cellPadding: 0.5 },
                styles: { fontSize: 7, cellPadding: 0.5, textColor: 0 },
                columnStyles: { 0: { cellWidth: 15 } },
                margin: { left: 16, right: 14 }
            });

            // @ts-ignore
            y = this.doc.lastAutoTable.finalY + 4; // Muy poco espacio entre empleados
        });
    }
}