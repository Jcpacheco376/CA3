// src/utils/report-engine/CoreReportGenerator.ts
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- TEMAS (Sin cambios) ---
export const REPORT_THEMES = {
    corporate: { primary: '#1e3a8a', secondary: '#f1f5f9', text: '#334155', accent: '#3b82f6', name: 'Corporativo (Azul)' },
    emerald:   { primary: '#059669', secondary: '#ecfdf5', text: '#064e3b', accent: '#10b981', name: 'Esmeralda (Verde)' },
    rose:      { primary: '#be123c', secondary: '#fff1f2', text: '#881337', accent: '#f43f5e', name: 'Ejecutivo (Vino)' },
    eco:       { primary: '#000000', secondary: '#ffffff', text: '#000000', accent: '#000000', name: 'Eco (B/N)', isEco: true }
};

// --- LAYOUTS ACTUALIZADOS ---
export const REPORT_LAYOUTS = {
    standard: { label: 'Estándar', desc: 'Formato clásico de lectura' },
    compact:  { label: 'Compacto', desc: 'Lista condensada para ahorro de papel' },
    executive:{ label: 'Ejecutivo', desc: 'Diseño editorial minimalista' },
    // --- NUEVO LAYOUT PARA ESTE REPORTE ---
    signature:{ label: 'Firma',     desc: 'Espacio para firma autógrafa' } 
};

export type ReportThemeKey = keyof typeof REPORT_THEMES;
export type ReportLayoutKey = keyof typeof REPORT_LAYOUTS;

// --- CLASE MAESTRA (Sin cambios en la lógica, solo asegúrate de tener la versión completa anterior) ---
export abstract class BaseReportGenerator {
    protected doc: jsPDF;
    protected theme: typeof REPORT_THEMES.corporate;
    protected config: { title: string; subTitle: string; filtersText: string };

    constructor(themeKey: ReportThemeKey = 'corporate', config: { title: string; subTitle?: string; filtersText?: string }) {
        this.doc = new jsPDF();
        this.theme = REPORT_THEMES[themeKey];
        this.config = {
            title: config.title,
            subTitle: config.subTitle || '',
            filtersText: config.filtersText || ''
        };
    }

    public abstract generateContent(data: any): void;

    protected addHeader() {
        const pageWidth = this.doc.internal.pageSize.width;
        if (!this.theme.isEco) {
            this.doc.setFillColor(this.theme.primary);
            this.doc.rect(0, 0, 5, 297, 'F');
        }
        this.doc.setFontSize(22);
        this.doc.setTextColor(this.theme.isEco ? '#000000' : this.theme.primary);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(this.config.title, 16, 20);

        if (this.config.subTitle) {
            this.doc.setFontSize(11);
            this.doc.setTextColor(this.theme.isEco ? 80 : 100);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(this.config.subTitle, 16, 27);
        }

        this.doc.setFontSize(10);
        this.doc.setTextColor(180);
        this.doc.text("Sistema de Control de Asistencia", pageWidth - 14, 18, { align: 'right' });
        
        this.doc.setDrawColor(200);
        this.doc.setLineWidth(0.5);
        this.doc.line(16, 35, pageWidth - 14, 35);
    }

    protected addFooter() {
        const pageCount = this.doc.internal.getNumberOfPages();
        const width = this.doc.internal.pageSize.width;
        const height = this.doc.internal.pageSize.height;

        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i);
            this.doc.setFontSize(8);
            this.doc.setTextColor(150);
            const dateStr = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es });
            this.doc.text(`Generado el ${dateStr}`, 16, height - 10);
            this.doc.text(`Pág ${i} de ${pageCount}`, width - 14, height - 10, { align: 'right' });
        }
    }

    protected drawTable(headers: string[], body: any[], startY: number, fontSize: number = 8) {
        autoTable(this.doc, {
            startY: startY,
            head: [headers],
            body: body,
            theme: this.theme.isEco ? 'plain' : 'grid',
            headStyles: {
                fillColor: this.theme.isEco ? 255 : this.theme.primary,
                textColor: this.theme.isEco ? 0 : 255,
                fontStyle: 'bold',
                lineWidth: this.theme.isEco ? 0.1 : 0,
                lineColor: 0
            },
            styles: {
                fontSize: fontSize,
                cellPadding: this.theme.isEco ? 1 : 2,
                textColor: this.theme.text,
                lineColor: 220,
                lineWidth: 0.1
            },
            // Mantenemos el coloreado básico de faltas
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                     const val = String(data.cell.raw);
                     if (val.includes('Falta') || val === 'F') data.cell.styles.textColor = [220, 38, 38];
                }
            },
            margin: { left: 16, right: 14 }
        });
        // @ts-ignore
        return this.doc.lastAutoTable.finalY;
    }

    public getBlobUrl(): string {
        this.addFooter();
        return this.doc.output('bloburl').toString();
    }

    public save(fileName: string) {
        const blob = this.doc.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    public async saveWithDialog(fileName: string) {
        // @ts-ignore
        if (typeof window.showSaveFilePicker === 'function') {
            try {
                // @ts-ignore
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{ description: 'PDF File', accept: { 'application/pdf': ['.pdf'] } }],
                });
                const writable = await handle.createWritable();
                await writable.write(this.doc.output('blob'));
                await writable.close();
                return;
            } catch (err: any) { return; }
        }
        this.save(fileName);
    }
}