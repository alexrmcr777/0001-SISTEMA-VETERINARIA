import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MascotaService } from '../../../../services/mascotas';
import { DuenoService } from '../../../../services/duenos';
import { Mascota } from '../../../../models/mascotas.model';
import { Dueno } from '../../../../models/duenos.model';

@Component({
  selector: 'app-crear-mascota',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './crear-mascota.html',
  styleUrl: './crear-mascota.css',
})
export class CrearMascota implements OnInit {
  nuevaMascota: Mascota = {
    id_mascota: 0,
    nombre: '',
    especie: '',
    raza: '',
    fecha_nacimiento: '',
    dueno: '',
    telefono: '',
    email: '',
    foto: undefined
  };

  fotoPreview: string | null = null;
  fotoError = '';

  // Dueño vinculado
  modoDueno: 'registrado' | 'nuevo' = 'registrado';
  duenos: Dueno[] = [];

  constructor(
    private mascotaService: MascotaService,
    private duenoService: DuenoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.duenoService.obtenerDuenos().subscribe({
      next: d => this.duenos = d
    });
  }

  onFotoSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.fotoError = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.fotoError = 'El archivo debe ser una imagen (JPG, PNG, WEBP…)';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.fotoError = 'La imagen no debe superar 2 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.fotoPreview = reader.result as string;
      this.nuevaMascota.foto = this.fotoPreview;
    };
    reader.readAsDataURL(file);
  }

  quitarFoto() {
    this.fotoPreview = null;
    this.nuevaMascota.foto = undefined;
  }

  cambiarModoDueno(modo: 'registrado' | 'nuevo') {
    this.modoDueno = modo;
    this.nuevaMascota.dueno = '';
  }

  onDuenoSelected(nombre: string) {
    const d = this.duenos.find(x => x.nombre === nombre);
    if (d) {
      if (!this.nuevaMascota.telefono) this.nuevaMascota.telefono = d.telefono ?? '';
      if (!this.nuevaMascota.email)    this.nuevaMascota.email    = d.email    ?? '';
    }
  }

  onEspecieChange() {
    this.nuevaMascota.raza = '';
  }

  guardarMascota() {
    this.mascotaService.crearMascota(this.nuevaMascota).subscribe({
      next: () => {
        this.router.navigate(['/mascotas']);
      },
      error: (err) => {
        console.error(err);
        alert('Error al registrar la mascota.');
      }
    });
  }
}
