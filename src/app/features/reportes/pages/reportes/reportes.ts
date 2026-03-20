import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ReportesService,
  ReporteResumen,
  ReporteCita,
  ReporteConsulta,
} from '../../../../services/reportes';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';
import { Observable } from 'rxjs';

Chart.register(...registerables);

type Tab = 'resumen' | 'citas' | 'consultas';
type Periodo = 'hoy' | 'semana' | 'mes' | 'anio' | 'personalizado';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit, OnDestroy, AfterViewChecked {
  tab: Tab = 'resumen';
  periodoBtnActivo: Periodo = 'mes';

  desde: string = '';
  hasta: string = '';

  cargando = false;
  error = '';

  resumen: ReporteResumen | null = null;
  datosCitas: ReporteCita[] = [];
  datosConsultas: ReporteConsulta[] = [];

  readonly estadoClases: Record<string, string> = {
    'Atendida':   'badge-atendida',
    'Confirmada': 'badge-confirmada',
    'Programada': 'badge-programada',
    'Cancelada':  'badge-cancelada',
    'No asistió': 'badge-no-asistio',
  };

  private chartDonut: Chart | null = null;
  private chartVets: Chart | null = null;
  private chartCitasBar: Chart | null = null;
  private chartConsultasBar: Chart | null = null;
  private chartsNeedRender = false;

  // Request-ID pattern: ignores stale responses from previous requests
  private requestId = 0;

  constructor(private reportesService: ReportesService, private el: ElementRef) {}

  ngOnInit() {
    this.reportesService.clearAll(); // Always fetch fresh data when page loads
    this.aplicarPeriodo('mes');
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  ngAfterViewChecked() {
    if (this.chartsNeedRender) {
      this.chartsNeedRender = false;
      this.renderCharts();
    }
  }

  aplicarPeriodo(periodo: Periodo) {
    this.periodoBtnActivo = periodo;
    const hoy = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    switch (periodo) {
      case 'hoy':
        this.desde = this.hasta = fmt(hoy);
        break;
      case 'semana': {
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - hoy.getDay() + (hoy.getDay() === 0 ? -6 : 1));
        this.desde = fmt(lunes);
        this.hasta = fmt(hoy);
        break;
      }
      case 'mes':
        this.desde = fmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
        this.hasta = fmt(hoy);
        break;
      case 'anio':
        this.desde = fmt(new Date(hoy.getFullYear(), 0, 1));
        this.hasta = fmt(hoy);
        break;
      case 'personalizado':
        // Keep current values, just mark as personalizado
        break;
    }

    if (periodo !== 'personalizado') {
      this.cargarDatos();
    }
  }

  onFechaChange() {
    this.periodoBtnActivo = 'personalizado';
    if (this.desde && this.hasta && this.desde <= this.hasta) {
      this.cargarDatos();
    }
  }

  cargarDatos() {
    if (!this.desde || !this.hasta) return;

    const reqId = ++this.requestId;

    let req$: Observable<any>;
    if (this.tab === 'resumen') {
      req$ = this.reportesService.getResumen(this.desde, this.hasta);
    } else if (this.tab === 'citas') {
      req$ = this.reportesService.getCitas(this.desde, this.hasta);
    } else {
      req$ = this.reportesService.getConsultas(this.desde, this.hasta);
    }

    // Only show spinner if the response won't be instant (not cached).
    // We start loading=true, but if the observable emits synchronously
    // (cache hit → of(value)), the next callback runs before cargando
    // is ever rendered, so the user never sees a flash of the spinner.
    this.cargando = true;
    this.error = '';

    req$.subscribe({
      next: (data: any) => {
        if (reqId !== this.requestId) return;
        if (this.tab === 'resumen') {
          this.resumen = data as ReporteResumen;
          // Prefetch citas + consultas in the background for instant tab switching
          this.reportesService.prefetch(this.desde, this.hasta);
        } else if (this.tab === 'citas') {
          this.datosCitas = data as ReporteCita[];
        } else {
          this.datosConsultas = data as ReporteConsulta[];
        }
        this.cargando = false;
        this.chartsNeedRender = true;
      },
      error: () => {
        if (reqId !== this.requestId) return;
        this.error = 'Error al cargar los datos.';
        this.cargando = false;
      },
    });
  }

  setTab(t: Tab) {
    this.tab = t;
    this.destroyCharts();
    this.cargarDatos();
  }

  get periodoLabel(): string {
    if (this.desde === this.hasta) return this.formatFecha(this.desde);
    return `${this.formatFecha(this.desde)} – ${this.formatFecha(this.hasta)}`;
  }

  private formatFecha(f: string): string {
    if (!f) return '';
    const [y, m, d] = f.split('-');
    return `${d}/${m}/${y}`;
  }

  // ── CHARTS ───────────────────────────────────────────────────────────────────
  private destroyCharts() {
    this.chartDonut?.destroy();     this.chartDonut = null;
    this.chartVets?.destroy();      this.chartVets = null;
    this.chartCitasBar?.destroy();  this.chartCitasBar = null;
    this.chartConsultasBar?.destroy(); this.chartConsultasBar = null;
  }

  private getCanvas(id: string): HTMLCanvasElement | null {
    return this.el.nativeElement.querySelector(`#${id}`) as HTMLCanvasElement | null;
  }

  private renderCharts() {
    if (this.tab === 'resumen' && this.resumen) {
      this.renderResumenCharts();
    } else if (this.tab === 'citas' && this.datosCitas.length) {
      this.renderCitasChart();
    } else if (this.tab === 'consultas' && this.datosConsultas.length) {
      this.renderConsultasChart();
    }
  }

  private renderResumenCharts() {
    const r = this.resumen!;

    // Donut: citas por estado
    const canvasDonut = this.getCanvas('chartDonut');
    if (canvasDonut) {
      this.chartDonut?.destroy();
      const estados = r.citas.por_estado;
      this.chartDonut = new Chart(canvasDonut, {
        type: 'doughnut',
        data: {
          labels: estados.map(e => e.estado),
          datasets: [{
            data: estados.map(e => e.cantidad),
            backgroundColor: ['#22c55e', '#3b82f6', '#eab308', '#ef4444', '#9ca3af'],
            borderWidth: 2,
            borderColor: '#fff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { font: { size: 12 }, padding: 14 } },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } },
          },
        },
      });
    }

    // Bar: top veterinarios
    const canvasVets = this.getCanvas('chartVets');
    if (canvasVets && r.top_veterinarios.length) {
      this.chartVets?.destroy();
      this.chartVets = new Chart(canvasVets, {
        type: 'bar',
        data: {
          labels: r.top_veterinarios.map(v => v.nombre),
          datasets: [{
            label: 'Consultas',
            data: r.top_veterinarios.map(v => v.consultas),
            backgroundColor: 'rgba(127, 0, 224, 0.75)',
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } },
            x: { grid: { display: false } },
          },
        },
      });
    }
  }

  private renderCitasChart() {
    const canvasCitas = this.getCanvas('chartCitasBar');
    if (!canvasCitas) return;
    this.chartCitasBar?.destroy();

    const conteo: Record<string, number> = {};
    for (const c of this.datosCitas) {
      conteo[c.estado] = (conteo[c.estado] || 0) + 1;
    }
    const labels = Object.keys(conteo);
    const colores: Record<string, string> = {
      'Atendida': '#22c55e', 'Confirmada': '#3b82f6',
      'Programada': '#eab308', 'Cancelada': '#ef4444', 'No asistió': '#9ca3af',
    };

    this.chartCitasBar = new Chart(canvasCitas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Cantidad de citas',
          data: labels.map(l => conteo[l]),
          backgroundColor: labels.map(l => colores[l] ?? '#a855f7'),
          borderRadius: 7,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  private renderConsultasChart() {
    const canvas = this.getCanvas('chartConsultasBar');
    if (!canvas) return;
    this.chartConsultasBar?.destroy();

    const conteo: Record<string, number> = {};
    for (const c of this.datosConsultas) {
      const vet = c.veterinario || 'Sin asignar';
      conteo[vet] = (conteo[vet] || 0) + 1;
    }
    const labels = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a]).slice(0, 10);

    this.chartConsultasBar = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Consultas',
          data: labels.map(l => conteo[l]),
          backgroundColor: 'rgba(99, 102, 241, 0.75)',
          borderRadius: 7,
          borderSkipped: false,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } },
          y: { grid: { display: false } },
        },
      },
    });
  }


  private buildPdfHeader(doc: jsPDF, titulo: string) {
    const pageW = doc.internal.pageSize.getWidth();

    // Purple header band
    doc.setFillColor(127, 0, 224);
    doc.rect(0, 0, pageW, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Clínica Veterinaria Pet Care', 14, 11);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(titulo, 14, 20);

    doc.setFontSize(9);
    doc.text(`Período: ${this.periodoLabel}`, pageW - 14, 20, { align: 'right' });

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    const generadoEl = new Date().toLocaleString('es-ES');
    doc.text(`Generado el ${generadoEl}`, 14, 34);
  }

  // ── PDF: RESUMEN ─────────────────────────────────────────────────────────────
  descargarResumenPdf() {
    if (!this.resumen) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.buildPdfHeader(doc, 'Reporte de Resumen General');

    const r = this.resumen;
    let y = 42;

    // Stats grid as simple table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 0, 160);
    doc.text('Estadísticas del período', 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de citas', String(r.citas.total)],
        ['Citas atendidas', String(r.citas.atendidas)],
        ['Citas confirmadas', String(r.citas.confirmadas)],
        ['Citas programadas', String(r.citas.programadas)],
        ['Citas canceladas', String(r.citas.canceladas)],
        ['Citas - No asistió', String(r.citas.no_asistio)],
        ['Total de consultas', String(r.consultas.total)],
        ['Total de mascotas registradas', String(r.pacientes.total_mascotas)],
        ['Total de dueños registrados', String(r.pacientes.total_duenos)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [127, 0, 224] },
      alternateRowStyles: { fillColor: [247, 240, 255] },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 40, halign: 'center' } },
      margin: { left: 14, right: 14 },
    });

    const afterTable = (doc as any).lastAutoTable?.finalY ?? y + 60;

    if (r.top_veterinarios.length > 0) {
      let y2 = afterTable + 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 0, 160);
      doc.text('Top veterinarios por consultas', 14, y2);
      y2 += 4;

      autoTable(doc, {
        startY: y2,
        head: [['Veterinario', 'Consultas']],
        body: r.top_veterinarios.map(v => [v.nombre, String(v.consultas)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [127, 0, 224] },
        alternateRowStyles: { fillColor: [247, 240, 255] },
        margin: { left: 14, right: 14 },
      });
    }

    doc.save(`reporte-resumen-${this.desde}-${this.hasta}.pdf`);
  }

  // ── PDF: CITAS ───────────────────────────────────────────────────────────────
  descargarCitasPdf() {
    if (!this.datosCitas.length) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    this.buildPdfHeader(doc, `Reporte de Citas — ${this.datosCitas.length} registro(s)`);

    autoTable(doc, {
      startY: 42,
      head: [['#', 'Fecha', 'Hora', 'Mascota', 'Dueño', 'Veterinario', 'Motivo', 'Estado']],
      body: this.datosCitas.map((c, i) => [
        String(i + 1),
        this.formatFecha(c.fecha),
        c.hora ?? '',
        c.mascota ?? '',
        c.dueno ?? '',
        c.veterinario ?? '',
        c.motivo ?? '',
        c.estado ?? '',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [127, 0, 224] },
      alternateRowStyles: { fillColor: [247, 240, 255] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 16 },
        7: { cellWidth: 24 },
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`reporte-citas-${this.desde}-${this.hasta}.pdf`);
  }

  // ── PDF: CONSULTAS ───────────────────────────────────────────────────────────
  descargarConsultasPdf() {
    if (!this.datosConsultas.length) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    this.buildPdfHeader(doc, `Reporte de Consultas — ${this.datosConsultas.length} registro(s)`);

    autoTable(doc, {
      startY: 42,
      head: [['#', 'Fecha', 'Mascota', 'Dueño', 'Veterinario', 'Motivo', 'Diagnóstico', 'Tratamiento']],
      body: this.datosConsultas.map((c, i) => [
        String(i + 1),
        this.formatFecha(c.fecha),
        c.mascota ?? '',
        c.dueno ?? '',
        c.veterinario ?? '',
        c.motivo ?? '',
        c.diagnostico ?? '',
        c.tratamiento ?? '',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [127, 0, 224] },
      alternateRowStyles: { fillColor: [247, 240, 255] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`reporte-consultas-${this.desde}-${this.hasta}.pdf`);
  }
}
