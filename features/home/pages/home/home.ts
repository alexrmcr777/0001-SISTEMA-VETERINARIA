import { Component, OnDestroy, OnInit } from '@angular/core';
import { HomeCard } from '../../components/home-card/home-card';
import { TableComponent } from '../../components/table/table';
import { DashboardService } from '../../../../services/dashboard';
import { CitaService } from '../../../../services/citas';
import { AuthService } from '../../../../services/auth';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Cita } from '../../../../models/citas.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HomeCard, TableComponent, FormsModule, RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  // Stats generales
  citasHoy: number = 0;
  totalCitas: number = 0;
  totalPacientes: number = 0;
  totalDuenos: number = 0;
  citasAtendidas: number = 0;
  citasCanceladas: number = 0;
  citasReprogramadas: number = 0;
  citasProgramadas: number = 0;
  citasNoAsistio: number = 0;
  consultasHoyCount: number = 0;
  consultasTotal: number = 0;
  fechaHoy: string = '';

  // Período
  periodoActivo: string = 'hoy';
  periodoRangoLabel: string = '';
  private periodoDesde: string = '';
  private periodoHasta: string = '';

  // Panel veterinario
  isVet = false;
  citasHoyConfirmadas: Cita[] = [];  // Client arrived & paid — ready to attend
  citasHoyProgramadas: Cita[] = [];  // Scheduled but not yet confirmed
  readonly hoyStr = new Date().toISOString().split('T')[0];

  // Filtro de fecha para la tabla
  fechaFiltro: string = '';
  citasTabla: Cita[] = [];
  private todasLasCitas: Cita[] = [];

  private subCitas!: Subscription;

  constructor(
    private dashboardService: DashboardService,
    private citaService: CitaService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const d = new Date();
    this.fechaFiltro = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.fechaHoy = d.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Check vet role
    const session = this.auth.getCurrentUser();
    if (session) {
      const user = this.auth.getUserById(session.id);
      this.isVet = user?.puestoTrabajo === 'medico_veterinario';
    }

    // Initialize period (sets periodoDesde/periodoHasta) and fetches dashboard
    this.setPeriodo('hoy');

    this.subCitas = this.citaService.obtenerCitas().subscribe({
      next: (citas) => {
        this.todasLasCitas    = citas;
        this.citasProgramadas = citas.filter(c => c.estado === 'Programada').length;
        this.citasNoAsistio   = citas.filter(c => c.estado === 'No asistió').length;
        const citasHoy = citas
          .filter(c => c.fecha === this.hoyStr)
          .sort((a, b) => a.hora.localeCompare(b.hora));
        this.citasHoyConfirmadas = citasHoy.filter(c => c.estado === 'Confirmada');
        this.citasHoyProgramadas = citasHoy.filter(c => c.estado === 'Programada');
        this.aplicarFiltro();
        // Refresh period stats whenever citas list changes (create/update/cancel/reschedule)
        this.cargarDashboard();
      }
    });
  }

  setPeriodo(periodo: string): void {
    this.periodoActivo = periodo;
    const { desde, hasta, label } = this.getRangoFechas(periodo);
    this.periodoDesde = desde;
    this.periodoHasta = hasta;
    this.periodoRangoLabel = label;
    // Sync table: show today when "hoy", clear date filter for other periods (shows all)
    this.fechaFiltro = (periodo === 'hoy') ? this.hoyStr : '';
    this.aplicarFiltro();
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.dashboardService.obtenerDashboard(this.periodoDesde, this.periodoHasta)
      .subscribe({ next: data => this.aplicarDatos(data) });
  }

  private getRangoFechas(periodo: string): { desde: string; hasta: string; label: string } {
    const hoy = new Date();
    const hasta = hoy.toISOString().split('T')[0];
    const diasAtras: Record<string, number> = {
      hoy: 0, semanal: 6, mensual: 29, trimestral: 89, semestral: 179, anual: 364
    };
    const dias = diasAtras[periodo] ?? 0;
    const desdeDate = new Date(hoy);
    desdeDate.setDate(desdeDate.getDate() - dias);
    const desde = desdeDate.toISOString().split('T')[0];
    const fmt = (s: string) => s.split('-').reverse().join('/');
    const label = desde === hasta ? fmt(hasta) : `${fmt(desde)} – ${fmt(hasta)}`;
    return { desde, hasta, label };
  }

  pct(valor: number): number {
    return this.totalCitas > 0 ? Math.round((valor / this.totalCitas) * 100) : 0;
  }

  aplicarFiltro(): void {
    this.citasTabla = this.fechaFiltro
      ? this.todasLasCitas.filter(c => c.fecha === this.fechaFiltro)
      : this.todasLasCitas;
  }

  onFechaChange(): void {
    this.aplicarFiltro();
  }

  limpiarFiltro(): void {
    this.fechaFiltro = '';
    this.aplicarFiltro();
  }

  atenderCita(cita: Cita): void {
    const params: any = { mascota: cita.mascota };
    if (cita.id_mascota) params.id_mascota = cita.id_mascota;
    if (cita.motivo)     params.motivo = cita.motivo;
    if (cita.id_cita)    params.cita_id = cita.id_cita;
    this.router.navigate(['/consultas/crear'], { queryParams: params });
  }

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Programada': 'programada',
      'Confirmada': 'confirmada',
      'Atendida': 'atendida',
      'Cancelada': 'cancelada',
      'No asistió': 'no-asistio',
    };
    return map[estado] || 'programada';
  }

  private aplicarDatos(data: any): void {
    this.citasHoy          = data.citas_hoy_count;
    this.totalCitas        = data.citas_pendientes;
    this.totalPacientes    = data.total_pacientes;
    this.totalDuenos       = data.total_duenos;
    this.citasAtendidas    = data.citas_atendidas;
    this.citasCanceladas   = data.citas_canceladas;
    this.citasReprogramadas = data.citas_reprogramadas ?? 0;
    this.consultasHoyCount = data.consultas_hoy_count;
    this.consultasTotal    = data.consultas_total;
  }

  ngOnDestroy(): void {
    this.subCitas?.unsubscribe();
  }
}
