// src/utils/reportExporter.ts
import * as XLSX from 'xlsx';
// import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- TEMAS (COLORES) ---
export const REPORT_THEMES = {
    corporate: { primary: '#1e3a8a', secondary: '#f1f5f9', text: '#334155', name: 'Corporativo' },
    emerald:   { primary: '#059669', secondary: '#ecfdf5', text: '#064e3b', name: 'Esmeralda' },
    rose:      { primary: '#be123c', secondary: '#fff1f2', text: '#881337', name: 'Ejecutivo' },
    eco:       { primary: '#000000', secondary: '#ffffff', text: '#000000', name: 'Eco (B/N)', isEco: true }
};

// --- NUEVO: VERSIONES DE DISEÑO ---
export const REPORT_LAYOUTS = {
    standard: { label: 'Estándar', desc: 'Tarjetas separadas por empleado' },
    compact:  { label: 'Compacto', desc: 'Lista continua optimizada' },
    modern:   { label: 'Moderno',  desc: 'Encabezados de sección completos' }
};

export type ReportThemeKey = keyof typeof REPORT_THEMES;
export type ReportLayoutKey = keyof typeof REPORT_LAYOUTS; // Nuevo tipo

// export class PDFReportBuilder {
//     private doc: jsPDF;
//     private title: string;
//     private subTitle: string;
//     private filtersText: string;
//     private theme: typeof REPORT_THEMES.corporate;
//     private layout: ReportLayoutKey; // Nueva propiedad

//     constructor(
//         title: string, 
//         subTitle: string = '', 
//         filtersText: string = '', 
//         themeKey: ReportThemeKey = 'corporate',
//         layout: ReportLayoutKey = 'standard' // Default
//     ) {
//         this.doc = new jsPDF();
//         this.title = title;
//         this.subTitle = subTitle;
//         this.filtersText = filtersText;
//         this.theme = REPORT_THEMES[themeKey];
//         this.layout = layout;
//     }

//     private addHeader() {
//         const pageWidth = this.doc.internal.pageSize.width;
//         const pageHeight = this.doc.internal.pageSize.height;
        
//         // Franja lateral (Solo si no es Eco y no es Compacto extremo)
//         if (!this.theme.isEco && this.layout !== 'compact') {
//             this.doc.setFillColor(this.theme.primary);
//             this.doc.rect(0, 0, 4, pageHeight, 'F'); 
//         }

//         // Título
//         this.doc.setFontSize(this.layout === 'compact' ? 18 : 22);
//         this.doc.setTextColor(this.theme.isEco ? '#000000' : this.theme.primary);
//         this.doc.setFont('helvetica', 'bold');
//         this.doc.text(this.title, 14, 20);

//         // Subtítulo
//         if (this.subTitle) {
//             this.doc.setFontSize(11);
//             this.doc.setTextColor(this.theme.isEco ? 80 : 100);
//             this.doc.setFont('helvetica', 'normal');
//             this.doc.text(this.subTitle, 14, 27);
//         }

//         // Marca de agua
//         this.doc.setFontSize(10);
//         this.doc.setTextColor(200);
//         this.doc.text("Control de Asistencia", pageWidth - 14, 15, { align: 'right' });
        
//         this.doc.setDrawColor(200);
//         this.doc.line(14, 35, pageWidth - 14, 35);
//     }

//     private addFooter() {
//         const pageCount = this.doc.internal.getNumberOfPages();
//         const width = this.doc.internal.pageSize.width;
//         const height = this.doc.internal.pageSize.height;

//         for (let i = 1; i <= pageCount; i++) {
//             this.doc.setPage(i);
//             this.doc.setFontSize(8);
//             this.doc.setTextColor(150);
//             const dateStr = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es });
//             this.doc.text(`Generado el ${dateStr}`, 14, height - 10);
//             this.doc.text(`Pág ${i} de ${pageCount}`, width - 14, height - 10, { align: 'right' });
//         }
//     }

//     public generateKardex(employeesData: any[]): PDFReportBuilder {
//         this.addHeader();
        
//         // Ajustamos el inicio según el layout
//         let currentY = this.layout === 'compact' ? 40 : 45;

//         employeesData.forEach((emp) => {
//             // Control de salto de página inteligente
//             if (currentY > 260) {
//                 this.doc.addPage();
//                 this.addHeader();
//                 currentY = this.layout === 'compact' ? 40 : 45;
//             }

//             // --- RENDERIZADO DE ENCABEZADO DE EMPLEADO (SEGÚN VERSIÓN) ---
            
//             if (this.layout === 'standard') {
//                 // VERSIÓN ESTÁNDAR: Tarjeta redondeada con fondo suave
//                 if (this.theme.isEco) {
//                     this.doc.setDrawColor(0);
//                     this.doc.setLineWidth(0.1);
//                     this.doc.rect(14, currentY, 182, 16); 
//                 } else {
//                     this.doc.setFillColor(this.theme.secondary);
//                     this.doc.setDrawColor(this.theme.primary); 
//                     this.doc.roundedRect(14, currentY, 182, 16, 2, 2, 'FD');
//                 }
//                 this.doc.setFontSize(11);
//                 this.doc.setTextColor(this.theme.isEco ? 0 : this.theme.primary);
//                 this.doc.setFont('helvetica', 'bold');
//                 this.doc.text(`${emp.nombre}`, 18, currentY + 6);
                
//                 this.doc.setFontSize(9);
//                 this.doc.setTextColor(80);
//                 this.doc.setFont('helvetica', 'normal');
//                 this.doc.text(`${emp.codRef} - ${emp.departamento}`, 18, currentY + 11);
//                 currentY += 20;

//             } else if (this.layout === 'modern') {
//                 // VERSIÓN MODERNA: Barra sólida de color completo
//                 this.doc.setFillColor(this.theme.isEco ? 200 : this.theme.primary);
//                 this.doc.rect(14, currentY, 182, 8, 'F');
                
//                 this.doc.setFontSize(10);
//                 this.doc.setTextColor(255); // Texto blanco siempre (o negro si es eco claro)
//                 if (this.theme.isEco) this.doc.setTextColor(0);
                
//                 this.doc.setFont('helvetica', 'bold');
//                 this.doc.text(`${emp.nombre} (${emp.codRef})`, 16, currentY + 5.5);
                
//                 // Depto a la derecha
//                 this.doc.setFont('helvetica', 'normal');
//                 this.doc.text(emp.departamento || '', 194, currentY + 5.5, { align: 'right' });
                
//                 currentY += 12;

//             } else if (this.layout === 'compact') {
//                 // VERSIÓN COMPACTA: Texto simple, línea divisoria fina
//                 this.doc.setFontSize(10);
//                 this.doc.setTextColor(0);
//                 this.doc.setFont('helvetica', 'bold');
//                 this.doc.text(`${emp.codRef} - ${emp.nombre}`, 14, currentY + 4);
                
//                 this.doc.setDrawColor(200);
//                 this.doc.line(14, currentY + 6, 196, currentY + 6);
//                 currentY += 8;
//             }

//             // --- TABLA DE DATOS ---
//             const tableBody = emp.fichas.map((f: any) => [
//                 format(new Date(f.Fecha), 'dd/MM'),
//                 format(new Date(f.Fecha), 'EEE', { locale: es }),
//                 f.HoraEntrada ? format(new Date(f.HoraEntrada), 'HH:mm') : '--',
//                 f.HoraSalida ? format(new Date(f.HoraSalida), 'HH:mm') : '--',
//                 f.EstatusManualAbrev || '-',
//                 f.Comentarios || ''
//             ]);

//             autoTable(this.doc, {
//                 startY: currentY,
//                 head: [['Fecha', 'Día', 'Entrada', 'Salida', 'Estatus', 'Observaciones']],
//                 body: tableBody,
//                 // Temas de tabla según layout
//                 theme: (this.theme.isEco || this.layout === 'compact') ? 'plain' : 'grid',
                
//                 headStyles: { 
//                     // En moderno y estándar usamos color. En compacto usamos gris simple.
//                     fillColor: (this.layout === 'compact' || this.theme.isEco) ? [240, 240, 240] : this.theme.primary, 
//                     textColor: (this.layout === 'compact' || this.theme.isEco) ? 0 : 255,
//                     fontStyle: 'bold',
//                     fontSize: this.layout === 'compact' ? 7 : 8,
//                     cellPadding: this.layout === 'compact' ? 1 : 2
//                 },
//                 styles: { 
//                     fontSize: this.layout === 'compact' ? 7 : 8, 
//                     cellPadding: this.layout === 'compact' ? 1 : 2, 
//                     textColor: this.theme.text 
//                 },
//                 columnStyles: { 0: { cellWidth: 15 }, 5: { cellWidth: 'auto' } },
//                 didParseCell: (data) => {
//                     if (data.section === 'body' && data.column.index === 4) {
//                         const status = data.cell.raw;
//                         if (status === 'F') data.cell.styles.textColor = [220, 38, 38];
//                     }
//                 },
//                 margin: { left: 14, right: 14 }
//             });

//             // Espacio posterior según layout
//             // @ts-ignore
//             currentY = this.doc.lastAutoTable.finalY + (this.layout === 'compact' ? 4 : 10);
//         });

//         this.addFooter();
//         return this;
//     }

//     public getBlobUrl(): string {
//         return this.doc.output('bloburl').toString();
//     }

//     public save(fileName: string) {
//         const blob = this.doc.output('blob');
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = fileName;
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);
//         URL.revokeObjectURL(url);
//     }

//     public async saveWithDialog(fileName: string) {
//         // @ts-ignore
//         if (typeof window.showSaveFilePicker === 'function') {
//             try {
//                 // @ts-ignore
//                 const handle = await window.showSaveFilePicker({
//                     suggestedName: fileName,
//                     types: [{ description: 'PDF File', accept: { 'application/pdf': ['.pdf'] } }],
//                 });
//                 const writable = await handle.createWritable();
//                 await writable.write(this.doc.output('blob'));
//                 await writable.close();
//                 return;
//             } catch (err: any) {
//                 // Silencioso al cancelar
//                 return;
//             }
//         }
//         this.save(fileName);
//     }
// }

export const exportToExcel = (fileName: string, worksheetName: string, data: any[]) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajuste básico de ancho de columnas
    const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, worksheetName.substring(0, 30));
    XLSX.writeFile(wb, `${fileName}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
};