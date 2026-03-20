import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Dueno } from '../../../../models/duenos.model';
import { DuenoService } from '../../../../services/duenos';

@Component({
  selector: 'app-editar-dueno',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './editar-dueno.html',
  styleUrl: './editar-dueno.css',
})
export class EditarDueno implements OnInit {
  idDueno!: number;

  dueno: Dueno = {
    id_dueno: 0,
    nombre: '',
    telefono: '',
    email: '',
    direccion: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private duenoService: DuenoService
  ) { }

  ngOnInit() {
    this.idDueno = Number(this.route.snapshot.paramMap.get('id'));

    this.duenoService.obtenerDuenoPorId(this.idDueno).subscribe({
      next: (data) => {
        this.dueno = { ...data };
      },
      error: () => {
        alert('No se encontró el dueño');
        this.router.navigate(['/duenos']);
      }
    });
  }

  actualizarDueno() {
    this.duenoService.actualizarDueno(this.idDueno, this.dueno).subscribe({
      next: () => {
        alert('Dueño actualizado correctamente');
        this.router.navigate(['/duenos']);
      },
      error: (err) => {
        console.error(err);
        alert('Error al actualizar el dueño');
      }
    });
  }
}