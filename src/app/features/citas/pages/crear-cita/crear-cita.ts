import { Component, OnInit } from '@angular/core';
import { CitaService } from '../../../../services/citas';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MascotaService } from '../../../../services/mascotas';
import { DuenoService } from '../../../../services/duenos';
import { AuthService, UserAccount } from '../../../../services/auth';
import { Cita } from '../../../../models/citas.model';
import { Mascota } from '../../../../models/mascotas.model';
import { Dueno } from '../../../../models/duenos.model';

@Component({
  selector: 'app-crear-cita',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './crear-cita.html',
  styleUrl: './crear-cita.css',
})
export class CrearCita implements OnInit {
  nuevaCita: Cita = {
    id_cita: 0,
    mascota: '',
    dueno: '',
    veterinario: '',
    fecha: '',
    hora: '',
    estado: 'Programada',
    motivo: '',
    comentarios: '',
  };

  mascotas: Mascota[] = [];
  duenos: Dueno[] = [];
  veterinarios: UserAccount[] = [];

  // Toggle mascota: 'registrada' | 'nueva'
  modoMascota: 'registrada' | 'nueva' = 'registrada';

  // Toggle dueño: 'registrado' | 'nuevo'
  modoDueno: 'registrado' | 'nuevo' = 'registrado';

  constructor(
    private citaService: CitaService,
    private mascotaService: MascotaService,
    private duenoService: DuenoService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.cargarMascotas();
    this.cargarDuenos();
    this.cargarVeterinarios();
    // Pre-fill mascota desde queryParams (ej: navegar desde Mascotas → Programar cita)
    const params = this.route.snapshot.queryParamMap;
    const idMascota = params.get('id_mascota');
    const nombreMascota = params.get('mascota');
    if (idMascota || nombreMascota) {
      this.modoMascota = 'registrada';
      // Se pre-rellena después de cargar las mascotas en cargarMascotas()
      this._prefillMascota = { id: idMascota ? Number(idMascota) : null, nombre: nombreMascota };
    }
  }

  private _prefillMascota: { id: number | null; nombre: string | null } | null = null;

  cargarVeterinarios(): void {
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.veterinarios = users.filter(u => u.puestoTrabajo === 'medico_veterinario');
      },
      error: (err) => console.error('Error al cargar veterinarios', err)
    });
  }

  cargarMascotas(): void {
    this.mascotaService.obtenerMascotas().subscribe({
      next: (data) => {
        this.mascotas = data;
        // Pre-relleno de mascota desde queryParams
        if (this._prefillMascota) {
          const { id, nombre } = this._prefillMascota;
          const found = id
            ? data.find(m => m.id_mascota === id)
            : data.find(m => m.nombre.toLowerCase() === (nombre ?? '').toLowerCase());
          if (found) {
            this.nuevaCita.mascota = found.nombre;
            this.nuevaCita.dueno = found.dueno;
          }
        }
      },
      error: (err) => console.error('Error al cargar mascotas', err)
    });
  }

  cargarDuenos(): void {
    this.duenoService.obtenerDuenos().subscribe({
      next: (data) => { this.duenos = data; },
      error: (err) => console.error('Error al cargar dueños', err)
    });
  }

  cambiarModoMascota(modo: 'registrada' | 'nueva'): void {
    this.modoMascota = modo;
    this.nuevaCita.mascota = '';
    this.nuevaCita.id_mascota = undefined;
  }

  cambiarModoDueno(modo: 'registrado' | 'nuevo'): void {
    this.modoDueno = modo;
    this.nuevaCita.dueno = '';
  }

  /** Called when user picks a registered mascota from the dropdown */
  onMascotaSelected(nombre: string): void {
    const found = this.mascotas.find(m => m.nombre === nombre);
    this.nuevaCita.id_mascota = found?.id_mascota;
  }

  guardarCita() {
    if (this.modoMascota === 'nueva') {
      // Auto-register the new mascota (and dueno) first, then create the cita
      const mascotaData = {
        nombre: this.nuevaCita.mascota,
        dueno: this.nuevaCita.dueno || 'Sin especificar',
        telefono: '',
      };
      this.mascotaService.crearMascota(mascotaData as any).subscribe({
        next: (res: any) => {
          const citaFinal: Cita = { ...this.nuevaCita, id_mascota: res.id_mascota };
          this.citaService.crearCita(citaFinal).subscribe({
            next: () => { alert('¡Cita registrada con éxito!'); this.router.navigate(['/citas']); },
            error: () => alert('Error al guardar la cita.')
          });
        },
        error: () => alert('Error al registrar la mascota. Verifique los datos.')
      });
    } else {
      this.citaService.crearCita(this.nuevaCita).subscribe({
        next: () => {
          alert('¡Cita registrada con éxito!');
          this.router.navigate(['/citas']);
        },
        error: () => alert('Error al guardar la cita.')
      });
    }
  }
}
