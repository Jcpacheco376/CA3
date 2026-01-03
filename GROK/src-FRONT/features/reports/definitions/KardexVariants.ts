// src/features/reports/definitions/KardexVariants.ts
import { BaseReportGenerator } from '../../../utils/report-engine/CoreReportGenerator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import autoTable from 'jspdf-autotable';
import { ReportValidators } from './ReportRules'; 

// --- HELPERS DE FORMATO ---
const safeDate = (d: string) => {
    const parts = d.substring(0, 10).split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};
const fmtDate = (d: string) => format(safeDate(d), 'dd/MM/yyyy'); 
const fmtDay = (d: string) => format(safeDate(d), 'EEEE', { locale: es }); 
const fmtTime = (t: string | null) => t ? format(new Date(t), 'HH:mm') : '--'; 

// Función auxiliar para determinar el texto del estatus en PDF (Transparencia)
const getStatusText = (f: any) => {
    const validation = ReportValidators.kardex(f);
    let text = f.EstatusManualAbrev || '-';

    // Si está pendiente de aprobación, mostramos explícitamente que es Automático
    if (validation.status === 'pending_approval') {
        text = `(Auto) ${f.EstatusChecadorAbrev || '?'}`;
    }
    
    // Si hay incidencia, agregamos una marca de alerta
    if (validation.status === 'incident') {
        text += " (!)";
    }
    
    return text;
};

// Función auxiliar para aplicar estilos condicionales (Colores)
const applyStatusStyles = (data: any, rowData: any, statusColIndex: number, obsColIndex: number | null) => {
    if (data.section !== 'body') return;
    
    const validation = ReportValidators.kardex(rowData);

    // 1. Estilizado de la Columna ESTATUS
    if (data.column.index === statusColIndex) {
        data.cell.styles.fontStyle = 'bold';
        
        if (validation.status === 'pending_approval') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber-600 (Pendiente)
        } else if (validation.status === 'incident') {
            data.cell.styles.textColor = [147, 51, 234]; // Purple-600 (Incidencia)
        } else if (rowData.EstatusManualAbrev === 'F') {
            data.cell.styles.textColor = [220, 38, 38]; // Red-600 (Falta)
        } else if (rowData.EstatusManualAbrev === 'RET') {
            data.cell.styles.textColor = [234, 88, 12]; // Orange-600 (Retardo)
        } else if (rowData.EstatusManualAbrev === 'A') {
            data.cell.styles.textColor = [22, 163, 74]; // Green-600 (Asistencia)
        }
    }

    // 2. Estilizado de la Columna OBSERVACIONES (Si existe)
    if (obsColIndex !== null && data.column.index === obsColIndex) {
        if (validation.status === 'incident') {
            data.cell.styles.textColor = [147, 51, 234]; 
            data.cell.styles.fontStyle = 'italic';
        }
    }
};

// === VARIANTE 1: ESTÁNDAR (Tarjetas) ===
export class KardexStandardReport extends BaseReportGenerator {
    public generateContent(data: any[]) {
        this.addHeader();
        let y = 45;

        data.forEach(emp => {
            if (y > 240) { this.doc.addPage(); this.addHeader(); y = 45; }

            // Tarjeta de Empleado
            if (this.theme.isEco) {
                this.doc.setDrawColor(0); this.doc.setLineWidth(0.1); 
                this.doc.rect(16, y, 180, 18);
            } else {
                this.doc.setFillColor(this.theme.secondary); 
                this.doc.setDrawColor(this.theme.primary);
                this.doc.roundedRect(16, y, 180, 18, 2, 2, 'FD');
            }

            this.doc.setFontSize(11); 
            this.doc.setTextColor(this.theme.isEco ? 0 : this.theme.primary);
            this.doc.setFont('helvetica', 'bold'); 
            this.doc.text(emp.nombre, 20, y + 7);
            
            this.doc.setFontSize(9); 
            this.doc.setTextColor(80);
            this.doc.setFont('helvetica', 'normal'); 
            this.doc.text(`${emp.codRef} - ${emp.departamento}`, 20, y + 13);

            y += 20;

            const body = emp.fichas.map((f: any) => [
                fmtDate(f.Fecha), 
                fmtDay(f.Fecha), 
                fmtTime(f.HoraEntrada), 
                fmtTime(f.HoraSalida), 
                getStatusText(f), 
                f.Comentarios || ''
            ]);
            
            autoTable(this.doc, {
                startY: y,
                head: [['Fecha', 'Día', 'Entrada', 'Salida', 'Estatus', 'Observaciones']],
                body: body,
                theme: this.theme.isEco ? 'plain' : 'grid',
                headStyles: { 
                    fillColor: this.theme.isEco ? 255 : this.theme.primary, 
                    textColor: this.theme.isEco ? 0 : 255, 
                    fontStyle: 'bold', lineWidth: 0.1, lineColor: 0 
                },
                styles: { fontSize: 8, cellPadding: 2, textColor: this.theme.text, lineColor: 220, lineWidth: 0.1 },
                columnStyles: { 0: { cellWidth: 20 }, 4: { cellWidth: 25 }, 5: { cellWidth: 'auto' } },
                didParseCell: (data) => applyStatusStyles(data, emp.fichas[data.row.index], 4, 5), // Lógica de colores
                margin: { left: 16, right: 14 }
            });

            // @ts-ignore
            y = this.doc.lastAutoTable.finalY + 12;
        });
    }
}

// === VARIANTE 2: COMPACTA (Lista Continua) ===
export class KardexCompactReport extends BaseReportGenerator {
    public generateContent(data: any[]) {
        this.addHeader();
        let y = 40;

        data.forEach(emp => {
            if (y > 260) { this.doc.addPage(); this.addHeader(); y = 40; }

            this.doc.setFontSize(10); 
            this.doc.setTextColor(0);
            this.doc.setFont('helvetica', 'bold'); 
            this.doc.text(`${emp.codRef} - ${emp.nombre}`, 16, y);
            
            this.doc.setDrawColor(150); 
            this.doc.setLineWidth(0.1); 
            this.doc.line(16, y + 2, 195, y + 2);
            
            y += 4;

            const body = emp.fichas.map((f: any) => [
                fmtDate(f.Fecha).substring(0,5), 
                fmtDay(f.Fecha).substring(0,3), 
                fmtTime(f.HoraEntrada), 
                fmtTime(f.HoraSalida), 
                getStatusText(f), 
                f.Comentarios || ''
            ]);

            autoTable(this.doc, {
                startY: y,
                head: [['Fec', 'Día', 'Ent', 'Sal', 'Est', 'Obs']],
                body: body,
                theme: 'plain',
                headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', fontSize: 7, cellPadding: 1 },
                styles: { fontSize: 7, cellPadding: 1, textColor: this.theme.text },
                columnStyles: { 0: { cellWidth: 12 }, 4: { cellWidth: 20 } },
                didParseCell: (data) => applyStatusStyles(data, emp.fichas[data.row.index], 4, 5),
                margin: { left: 16, right: 14 }
            });

            // @ts-ignore
            y = this.doc.lastAutoTable.finalY + 6;
        });
    }
}

// === VARIANTE 3: EJECUTIVA (Antes "Elegante") ===
export class KardexExecutiveReport extends BaseReportGenerator {
    public generateContent(data: any[]) {
        this.addHeader();
        let y = 45;

        data.forEach(emp => {
            if (y > 250) { this.doc.addPage(); this.addHeader(); y = 45; }

            // Diseño "Flotante" Minimalista
            this.doc.setDrawColor(this.theme.isEco ? 0 : this.theme.primary);
            this.doc.setLineWidth(1.5);
            this.doc.line(16, y, 16, y + 10); 

            this.doc.setFontSize(12);
            this.doc.setTextColor(this.theme.isEco ? 0 : this.theme.text); 
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(emp.nombre.toUpperCase(), 20, y + 4);

            this.doc.setFontSize(9);
            this.doc.setTextColor(150);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(`${emp.codRef}  •  ${emp.departamento || 'Sin Depto'}  •  ${emp.puesto || 'Sin Puesto'}`, 20, y + 9);

            y += 15;

            const body = emp.fichas.map((f: any) => [
                fmtDate(f.Fecha), 
                fmtDay(f.Fecha), 
                fmtTime(f.HoraEntrada), 
                fmtTime(f.HoraSalida), 
                getStatusText(f), 
                f.Comentarios || ''
            ]);

            autoTable(this.doc, {
                startY: y,
                head: [['FECHA', 'DÍA', 'ENTRADA', 'SALIDA', 'ESTATUS', 'OBSERVACIONES']],
                body: body,
                theme: 'plain',
                headStyles: { 
                    fillColor: [255, 255, 255], 
                    textColor: this.theme.isEco ? 0 : this.theme.primary, 
                    fontStyle: 'bold',
                    fontSize: 8,
                    lineWidth: { bottom: 0.5 }, 
                    lineColor: this.theme.isEco ? 200 : this.theme.primary
                },
                styles: { 
                    fontSize: 9, 
                    cellPadding: 3, 
                    textColor: this.theme.text,
                    lineColor: 230, 
                    lineWidth: { bottom: 0.1 } 
                },
                columnStyles: { 
                    0: { cellWidth: 20 }, 
                    4: { cellWidth: 25 },
                    5: { cellWidth: 'auto', fontStyle: 'italic', textColor: 150 } 
                },
                didParseCell: (data) => applyStatusStyles(data, emp.fichas[data.row.index], 4, 5),
                margin: { left: 16, right: 14 }
            });

            // @ts-ignore
            y = this.doc.lastAutoTable.finalY + 15;
        });
    }
}