import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CitaService } from '../../../../services/citas';
import { AuthService } from '../../../../services/auth';
import { Cita } from '../../../../models/citas.model';

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './citas-component.html',
  styleUrls: ['./citas-component.css'],
})
export class CitasComponent implements OnInit {
  citas: Cita[] = [];
  filtros = { mascota: '', fecha: '', estado: '' };
  isLoading = false;
  errorMsg = '';

  isRecepcionista = false;
  isVet = false;

  // Reprogramar inline state
  citaReprogramandoId: number | null = null;
  nuevaFechaRep = '';
  nuevaHoraRep = '';

  private destroyRef = inject(DestroyRef);

  constructor(
    private citaService: CitaService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const session = this.auth.getCurrentUser();
    if (session) {
      this.isRecepcionista = session.puestoTrabajo === 'recepcionista';
      this.isVet = session.puestoTrabajo === 'medico_veterinario';
    }
    this.onFiltrar();
  }

  onFiltrar(): void {
    this.isLoading = true;
    this.errorMsg = '';
    this.citaService.filtrarCitas(this.filtros)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.citas = data.sort((a, b) => {
            if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
            return a.hora.localeCompare(b.hora);
          });
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMsg = 'Error al cargar las citas. Intenta de nuevo.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  confirmarLlegada(id: number | undefined): void {
    if (!id) return;
    if (!confirm('¿Confirmar llegada del cliente y pago de la consulta?')) return;
    this.citaService.confirmarCita(id).subscribe({
      next: () => this.onFiltrar(),
      error: () => alert('Error al confirmar la cita')
    });
  }

  cancelarCita(id: number | undefined) {
    if (!id) return;
    if (!confirm('¿Confirmar cancelación de esta cita? Quedará registrada como Cancelada.')) return;
    this.citaService.cancelarCita(id).subscribe({
      next: () => this.onFiltrar(),
      error: () => alert('Error al cancelar la cita')
    });
  }

  iniciarReprogramar(cita: Cita): void {
    this.citaReprogramandoId = cita.id_cita!;
    this.nuevaFechaRep = cita.fecha;
    this.nuevaHoraRep = cita.hora;
  }

  confirmarReprogramar(cita: Cita): void {
    if (!this.nuevaFechaRep || !this.nuevaHoraRep) {
      alert('Ingrese la nueva fecha y hora.');
      return;
    }
    this.citaService.reprogramarCita(cita.id_cita!, this.nuevaFechaRep, this.nuevaHoraRep).subscribe({
      next: () => { this.citaReprogramandoId = null; this.onFiltrar(); },
      error: () => alert('Error al reprogramar la cita')
    });
  }

  cerrarReprogramar(): void {
    this.citaReprogramandoId = null;
  }

  estadoClass(estado: string): string {
    const map: Record<string, string> = {
      'Programada': 'estado-programada',
      'Confirmada': 'estado-confirmada',
      'Atendida': 'estado-atendida',
      'Cancelada': 'estado-cancelada',
      'No asistió': 'estado-noasistio',
      'Reprogramada': 'estado-reprogramada',
    };
    return map[estado] || 'estado-programada';
  }
}
