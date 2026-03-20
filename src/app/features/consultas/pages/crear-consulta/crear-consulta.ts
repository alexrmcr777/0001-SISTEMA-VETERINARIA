import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConsultasService } from '../../../../services/consultas';
import { MascotaService } from '../../../../services/mascotas';
import { CitaService } from '../../../../services/citas';
import { AuthService } from '../../../../services/auth';
import { Mascota } from '../../../../models/mascotas.model';
import { Cita } from '../../../../models/citas.model';

@Component({
  selector: 'app-crear-consulta',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './crear-consulta.html',
  styleUrl: './crear-consulta.css',
})
export class CrearConsulta implements OnInit, OnDestroy {
  mascotas: Mascota[] = [];
  citasHoy: Cita[] = [];
  citaSeleccionadaId: number | undefined;
  loading = false;
  errorMsg = '';
  private _sub = new Subscription();

  // Form fields
  id_mascota: number | '' = '';
  fecha = new Date().toISOString().split('T')[0];
  hora = new Date().toTimeString().slice(0, 5);
  motivo_consulta = '';
  peso: number | '' = '';
  temperatura: number | '' = '';
  frecuencia_cardiaca: number | '' = '';
  frecuencia_respiratoria: number | '' = '';
  diagnostico = '';
  tratamiento = '';
  medicamentos = '';
  proxima_cita = '';
  observaciones = '';

  constructor(
    private consultasService: ConsultasService,
    private mascotaService: MascotaService,
    private citaService: CitaService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const hoy = new Date().toISOString().split('T')[0];

    // Citas del día (Programadas + Confirmadas) en tiempo real
    this._sub.add(
      this.citaService.obtenerCitas().subscribe(citas => {
        this.citasHoy = citas
          .filter(c => c.fecha === hoy && c.estado !== 'Atendida' && c.estado !== 'Cancelada' && c.estado !== 'No asistió')
          .sort((a, b) => a.hora.localeCompare(b.hora));
      })
    );

    this.mascotaService.obtenerMascotas().subscribe(m => {
      this.mascotas = m;
      // Pre-fill from query params (e.g. coming from vet agenda)
      const params = this.route.snapshot.queryParamMap;
      const idMascota = params.get('id_mascota');
      const nombreMascota = params.get('mascota');
      const motivo = params.get('motivo');

      if (idMascota) {
        this.id_mascota = Number(idMascota);
      } else if (nombreMascota) {
        // Try to find mascota by name (case-insensitive)
        const found = m.find(x => x.nombre.toLowerCase() === nombreMascota.toLowerCase());
        if (found) this.id_mascota = found.id_mascota ?? '';
      }

      if (motivo) this.motivo_consulta = motivo;

      // Also check if coming via cita_id query param
      const citaIdParam = params.get('cita_id');
      if (citaIdParam) this.citaSeleccionadaId = Number(citaIdParam);
    });
  }

  ngOnDestroy() { this._sub.unsubscribe(); }

  /** Selecciona una cita de la agenda y pre-rellena el formulario */
  seleccionarCita(cita: Cita) {
    this.citaSeleccionadaId = cita.id_cita;
    // Pre-fill mascota
    if (cita.id_mascota) {
      this.id_mascota = cita.id_mascota;
    } else {
      const found = this.mascotas.find(m => m.nombre.toLowerCase() === cita.mascota.toLowerCase());
      if (found) this.id_mascota = found.id_mascota ?? '';
    }
    // Pre-fill motivo
    if (cita.motivo) this.motivo_consulta = cita.motivo;
    // Pre-fill hora
    this.hora = cita.hora;
  }

  estadoCitaClass(estado: string): string {
    const map: Record<string, string> = {
      'Programada': 'chip-prog',
      'Confirmada': 'chip-conf',
    };
    return map[estado] ?? 'chip-prog';
  }

  get mascotaSeleccionada(): Mascota | undefined {
    return this.mascotas.find(m => m.id_mascota === Number(this.id_mascota));
  }

  guardar() {
    this.errorMsg = '';
    if (!this.id_mascota || !this.motivo_consulta || !this.diagnostico || !this.fecha || !this.hora) {
      this.errorMsg = 'Completa los campos obligatorios: mascota, fecha, hora, motivo y diagnóstico.';
      return;
    }
    const session = this.auth.getCurrentUser();

    this.loading = true;
    this.consultasService.crear({
      id_mascota: Number(this.id_mascota),
      nombre_mascota: this.mascotaSeleccionada?.nombre ?? '',
      id_veterinario: session?.id ?? '',
      nombre_veterinario: session?.nombreCompleto ?? session?.nombre ?? '',
      fecha: this.fecha,
      hora: this.hora,
      motivo_consulta: this.motivo_consulta,
      peso_kg: this.peso !== '' ? Number(this.peso) : undefined,
      temperatura_c: this.temperatura !== '' ? Number(this.temperatura) : undefined,
      frecuencia_cardiaca: this.frecuencia_cardiaca !== '' ? Number(this.frecuencia_cardiaca) : undefined,
      frecuencia_respiratoria: this.frecuencia_respiratoria !== '' ? Number(this.frecuencia_respiratoria) : undefined,
      diagnostico: this.diagnostico,
      tratamiento: this.tratamiento || undefined,
      medicamentos: this.medicamentos || undefined,
      proxima_cita: this.proxima_cita || undefined,
      observaciones: this.observaciones || undefined,
    }).subscribe({
      next: () => {
        // Marcar la cita como Atendida si se originó desde una cita
        if (this.citaSeleccionadaId) {
          this.citaService.marcarAtendida(this.citaSeleccionadaId).subscribe();
        }
        this.loading = false;
        this.router.navigate(['/consultas']);
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || 'Error al guardar la consulta.';
        this.loading = false;
      }
    });
  }
}
