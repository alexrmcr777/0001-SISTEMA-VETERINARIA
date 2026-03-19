import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConsultasService } from '../../../../services/consultas';
import { CitaService } from '../../../../services/citas';
import { Consulta } from '../../../../models/consultas.model';
import { Cita } from '../../../../models/citas.model';

type Vista = 'hoy' | 'todas';

@Component({
  selector: 'app-consultas-component',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './consultas-component.html',
  styleUrl: './consultas-component.css',
})
export class ConsultasComponent implements OnInit, OnDestroy {
  consultas: Consulta[] = [];
  filtradas: Consulta[] = [];
  busqueda = '';
  vista: Vista = 'hoy';
  readonly hoy = new Date().toISOString().split('T')[0];

  citasHoy: Cita[] = [];
  private _sub = new Subscription();

  constructor(
    private consultasService: ConsultasService,
    private citaService: CitaService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargar();
    this._sub.add(
      this.citaService.obtenerCitas().subscribe(citas => {
        this.citasHoy = citas
          .filter(c =>
            c.fecha === this.hoy &&
            c.estado !== 'Atendida' &&
            c.estado !== 'Cancelada' &&
            c.estado !== 'No asistió'
          )
          .sort((a, b) => {
            // Confirmadas primero, luego por hora
            if (a.estado === 'Confirmada' && b.estado !== 'Confirmada') return -1;
            if (b.estado === 'Confirmada' && a.estado !== 'Confirmada') return 1;
            return a.hora.localeCompare(b.hora);
          });
      })
    );
  }

  ngOnDestroy() { this._sub.unsubscribe(); }

  iniciarConsulta(cita: Cita) {
    this.router.navigate(['/consultas/crear'], {
      queryParams: {
        cita_id: cita.id_cita,
        id_mascota: cita.id_mascota ?? '',
        mascota: cita.mascota,
        motivo: cita.motivo ?? ''
      }
    });
  }

  estadoCitaClass(estado: string): string {
    return estado === 'Confirmada' ? 'chip-conf' : 'chip-prog';
  }

  cargar() {
    this.consultas = this.consultasService
      .getAll()
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    this.filtrar();
  }

  get consultasHoy(): Consulta[] {
    return this.consultas
      .filter(c => c.fecha === this.hoy)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }

  filtrar() {
    const q = this.busqueda.trim().toLowerCase();
    const base = this.vista === 'hoy'
      ? this.consultas.filter(c => c.fecha === this.hoy)
      : [...this.consultas];
    this.filtradas = q
      ? base.filter(
          c =>
            c.nombre_mascota.toLowerCase().includes(q) ||
            c.diagnostico.toLowerCase().includes(q) ||
            c.nombre_veterinario.toLowerCase().includes(q) ||
            c.motivo_consulta.toLowerCase().includes(q)
        )
      : base;
  }

  setVista(v: Vista) {
    this.vista = v;
    this.filtrar();
  }

  verHistorial(idMascota: number) {
    this.router.navigate(['/mascotas/historial', idMascota]);
  }

  eliminar(id: number) {
    if (!confirm('¿Eliminar esta consulta? Esta acción no se puede deshacer.')) return;
    this.consultasService.eliminar(id).subscribe({
      next: () => this.cargar()
    });
  }
}
