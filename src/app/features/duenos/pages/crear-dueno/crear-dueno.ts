import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DuenoService } from '../../../../services/duenos';
import { Dueno } from '../../../../models/duenos.model';

@Component({
  selector: 'app-crear-dueno',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './crear-dueno.html',
  styleUrl: './crear-dueno.css',
})
export class CrearDueno {
  nuevoDueno: Dueno = {
    id_dueno: 0,
    nombre: '',
    telefono: '',
    email: '',
    direccion: ''
  };

  constructor(
    private duenoService: DuenoService,
    private router: Router
  ) { }

  guardarDueno() {
    this.duenoService.crearDueno(this.nuevoDueno).subscribe({
      next: (duenoGuardado) => {
        console.log('Dueño guardado en memoria:', duenoGuardado);
        alert('¡Dueño registrado con éxito!');
        this.router.navigate(['/duenos']);
      },
      error: (err) => {
        console.error(err);
        alert('Error al registrar el dueño.');
      }
    });
  }
}