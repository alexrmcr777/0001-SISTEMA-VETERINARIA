import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Mascota } from '../../../../models/mascotas.model';
import { Cita } from '../../../../models/citas.model';
import { Consulta } from '../../../../models/consultas.model';
import { MascotaService } from '../../../../services/mascotas';
import { CitaService } from '../../../../services/citas';
import { ConsultasService } from '../../../../services/consultas';

@Component({
  selector: 'app-ver-historial',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ver-historial.html',
  styleUrl: './ver-historial.css',
})
export class VerHistorial implements OnInit, OnDestroy {
  mascota?: Mascota;
  citasFiltradas: Cita[] = [];
  consultasFiltradas: Consulta[] = [];
  private _sub = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private mascotaService: MascotaService,
    private citaService: CitaService,
    private consultasService: ConsultasService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this._sub.add(
      this.mascotaService.obtenerMascotaPorId(id).subscribe({
        next: (m) => {
          if (m) {
            this.mascota = m;
            this.cargarHistorial(m);
          }
        },
        error: (err) => console.error('Error al cargar mascota', err)
      })
    );
  }

  ngOnDestroy() { this._sub.unsubscribe(); }

  /** Calcula la edad en años y meses a partir de YYYY-MM-DD */
  calcularEdad(fechaNacimiento: string): string {
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    let anios = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth() - nacimiento.getMonth();
    if (hoy.getDate() < nacimiento.getDate()) meses--;
    if (meses < 0) { anios--; meses += 12; }
    if (anios > 0) return `${anios} año${anios > 1 ? 's' : ''}${ meses > 0 ? ` y ${meses} mes${meses > 1 ? 'es' : ''}` : '' }`;
    return `${meses} mes${meses !== 1 ? 'es' : ''}`;
  }

  cargarHistorial(mascota: Mascota) {
    // Reactive subscription for citas
    this._sub.add(
      this.citaService.obtenerCitas().subscribe({
        next: (todas) => {
          const filtradas = todas
            .filter(c => {
              if (mascota.id_mascota && c.id_mascota) {
                return c.id_mascota === mascota.id_mascota;
              }
              return c.mascota.trim().toLowerCase() === mascota.nombre.trim().toLowerCase();
            })
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
          this.citasFiltradas = filtradas;
          this.cdr.detectChanges();
        }
      })
    );

    // Reactive subscription for consultas
    this._sub.add(
      this.consultasService.obtenerConsultas().subscribe({
        next: (todas) => {
          this.consultasFiltradas = todas
            .filter(c => c.id_mascota === mascota.id_mascota)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
          this.cdr.detectChanges();
        }
      })
    );
  }
}
