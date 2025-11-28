// src/utils/reportExporter.ts
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- PALETA DE COLORES DE REPORTES ---
export const REPORT_THEMES = {
    corporate: { primary: '#1e3a8a', secondary: '#f1f5f9', text: '#334155', name: 'Corporativo' },
    emerald:   { primary: '#059669', secondary: '#ecfdf5', text: '#064e3b', name: 'Esmeralda' },
    rose:      { primary: '#be123c', secondary: '#fff1f2', text: '#881337', name: 'Ejecutivo' },
    violet:    { primary: '#7c3aed', secondary: '#f5f3ff', text: '#4c1d95', name: 'Creativo' },
    // Modo ECO: Blanco y Negro estricto
    eco:       { primary: '#ffffff', secondary: '#ffffff', text: '#000000', name: 'Ahorro de Tinta', isEco: true }
};

export type ReportThemeKey = keyof typeof REPORT_THEMES;

export class PDFReportBuilder {
    private doc: jsPDF;
    private title: string;
    private subTitle: string;
    private filtersText: string;
    private theme: typeof REPORT_THEMES.corporate;

    constructor(title: string, subTitle: string = '', filtersText: string = '', themeKey: ReportThemeKey = 'corporate') {
        this.doc = new jsPDF();
        this.title = title;
        this.subTitle = subTitle;
        this.filtersText = filtersText;
        this.theme = REPORT_THEMES[themeKey];
    }

    private addHeader() {
        const pageWidth = this.doc.internal.pageSize.width;
        const pageHeight = this.doc.internal.pageSize.height;
        
        // 1. Franja lateral (Solo si NO es Eco)
        if (!this.theme.isEco) {
            this.doc.setFillColor(this.theme.primary);
            this.doc.rect(0, 0, 4, pageHeight, 'F'); 
        }

        // 2. Título
        this.doc.setFontSize(22);
        this.doc.setTextColor(this.theme.isEco ? '#000000' : this.theme.primary);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(this.title, 14, 20);

        // 3. Subtítulo
        if (this.subTitle) {
            this.doc.setFontSize(12);
            this.doc.setTextColor(this.theme.isEco ? '#444444' : 100);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(this.subTitle, 14, 28);
        }

        // 4. Filtros
        if (this.filtersText) {
            this.doc.setFontSize(9);
            this.doc.setTextColor(150);
            this.doc.text(this.filtersText, 14, 35);
        }

        // 5. Marca de agua
        this.doc.setFontSize(10);
        this.doc.setTextColor(this.theme.isEco ? '#888888' : 200);
        this.doc.text("Control de Asistencia", pageWidth - 14, 15, { align: 'right' });
        
        this.doc.setDrawColor(200);
        this.doc.line(14, 38, pageWidth - 14, 38);
    }

    private addFooter() {
        const pageCount = this.doc.internal.getNumberOfPages();
        const width = this.doc.internal.pageSize.width;
        const height = this.doc.internal.pageSize.height;

        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i);
            this.doc.setFontSize(8);
            this.doc.setTextColor(150);
            const dateStr = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es });
            this.doc.text(`Generado el ${dateStr}`, 14, height - 10);
            this.doc.text(`Página ${i} de ${pageCount}`, width - 14, height - 10, { align: 'right' });
        }
    }

    public generateKardex(employeesData: any[]): PDFReportBuilder {
        this.addHeader();
        let currentY = 45;

        employeesData.forEach((emp) => {
            if (currentY > 250) {
                this.doc.addPage();
                this.addHeader();
                currentY = 45;
            }

            // Tarjeta Empleado
            if (this.theme.isEco) {
                this.doc.setDrawColor(0);
                this.doc.setLineWidth(0.1);
                this.doc.rect(14, currentY, 182, 18); 
            } else {
                this.doc.setFillColor(this.theme.secondary);
                this.doc.setDrawColor(this.theme.primary); 
                this.doc.roundedRect(14, currentY, 182, 18, 2, 2, 'FD');
            }
            
            this.doc.setFontSize(11);
            this.doc.setTextColor(this.theme.isEco ? '#000000' : this.theme.primary);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(`${emp.nombre}`, 18, currentY + 7);
            
            this.doc.setFontSize(9);
            this.doc.setTextColor(80);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(`ID: ${emp.codRef}  |  Depto: ${emp.departamento || 'N/A'}`, 18, currentY + 13);

            currentY += 22;

            const tableBody = emp.fichas.map((f: any) => [
                format(new Date(f.Fecha), 'dd/MM'),
                format(new Date(f.Fecha), 'EEE', { locale: es }),
                f.HoraEntrada ? format(new Date(f.HoraEntrada), 'HH:mm') : '--',
                f.HoraSalida ? format(new Date(f.HoraSalida), 'HH:mm') : '--',
                f.EstatusManualAbrev || '-',
                f.Comentarios || ''
            ]);

            autoTable(this.doc, {
                startY: currentY,
                head: [['Fecha', 'Día', 'Entrada', 'Salida', 'Estatus', 'Observaciones']],
                body: tableBody,
                theme: this.theme.isEco ? 'plain' : 'grid', 
                headStyles: { 
                    fillColor: this.theme.isEco ? [255, 255, 255] : this.theme.primary, 
                    textColor: this.theme.isEco ? 0 : 255,
                    fontStyle: 'bold',
                    lineWidth: this.theme.isEco ? 0.1 : 0, 
                    lineColor: 0
                },
                styles: { fontSize: 8, cellPadding: 2, textColor: this.theme.text },
                columnStyles: { 0: { cellWidth: 15 }, 5: { cellWidth: 'auto' } },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 4) {
                        const status = data.cell.raw;
                        if (status === 'F') data.cell.styles.textColor = [220, 38, 38];
                    }
                },
                margin: { left: 14, right: 14 }
            });

            // @ts-ignore
            currentY = this.doc.lastAutoTable.finalY + 10;
        });

        this.addFooter();
        return this;
    }

    public getBlobUrl(): string {
        return this.doc.output('bloburl').toString();
    }

    // --- 1. Descarga Directa (Botón Grande) ---
    public save(fileName: string) {
        this.doc.save(fileName);
    }

    // --- 2. Guardar Como... (Opción de menú) ---
    public async saveWithDialog(fileName: string) {
        // Verificamos si la API moderna "Guardar como" está disponible
        // @ts-ignore
        if (typeof window.showSaveFilePicker === 'function') {
            try {
                // @ts-ignore
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'PDF File',
                        accept: { 'application/pdf': ['.pdf'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(this.doc.output('blob'));
                await writable.close();
                
                // ¡ÉXITO! Salimos de la función aquí.
                return; 

            } catch (err: any) {
                // Si el error es "AbortError", significa que el usuario canceló el diálogo.
                // En este caso, NO debemos hacer nada más (no ejecutar el fallback).
                if (err.name === 'AbortError') {
                    console.log("Guardado cancelado por el usuario.");
                    return; 
                }
                
                // Solo si es un error real, lo logueamos (y podríamos intentar el fallback si quisiéramos)
                console.error("Error en API de guardado:", err);
            }
        } 
        
        // --- FALLBACK ---
        // Este código solo se ejecuta si:
        // 1. La API showSaveFilePicker NO existe en este navegador.
        // 2. Ocurrió un error técnico (no cancelación) en el bloque try anterior.
        this.doc.save(fileName);
    }
}

export const exportToExcel = (fileName: string, worksheetName: string, data: any[]) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, worksheetName.substring(0, 30));
    XLSX.writeFile(wb, `${fileName}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
};