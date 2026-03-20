import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CitaService } from '../../../../services/citas';
import { MascotaService } from '../../../../services/mascotas';
import { AuthService, UserAccount } from '../../../../services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Cita } from '../../../../models/citas.model';
import { Mascota } from '../../../../models/mascotas.model';

@Component({
  selector: 'app-editar-cita',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './editar-cita.html',
  styleUrl: '../crear-cita/crear-cita.css', // Reutiliza tus estilos
})
export class EditarCita implements OnInit {
  idCita!: number;
  mascotas: Mascota[] = [];
  veterinarios: UserAccount[] = [];

  // Objeto vinculado al modelo Cita
  cita: Cita = {
    id_cita: 0,
    mascota: '',
    veterinario: '',
    fecha: '',
    hora: '',
    estado: 'Programada',
    comentarios: '',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private citaService: CitaService,
    private mascotaService: MascotaService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.idCita = Number(this.route.snapshot.paramMap.get('id'));

    // 1. Cargar lista de mascotas para el select
    this.mascotaService.obtenerMascotas().subscribe((data) => (this.mascotas = data));

    // 2. Cargar veterinarios
    this.authService.getUsers().subscribe({
      next: users => this.veterinarios = users.filter(u => u.puestoTrabajo === 'medico_veterinario')
    });

    // 3. Cargar los datos actuales de la cita
    this.citaService.obtenerCitaPorId(this.idCita).subscribe({
      next: (data) => {
        // Limpieza de formatos para los inputs de HTML
        const fechaLimpia = data.fecha.includes('T') ? data.fecha.split('T')[0] : data.fecha;
        const horaLimpia = data.hora.length > 5 ? data.hora.substring(0, 5) : data.hora;

        this.cita = {
          ...data,
          fecha: fechaLimpia,
          hora: horaLimpia
        };
      },
      error: (err) => {
        alert('No se encontró la cita');
        this.router.navigate(['/citas']);
      }
    });
  }

  actualizarCita() {
    this.citaService.actualizarCita(this.idCita, this.cita).subscribe({
      next: () => {
        alert('Cita actualizada correctamente');
        this.router.navigate(['/citas']);
      },
      error: (err) => alert('Error al actualizar la cita'),
    });
  }
}