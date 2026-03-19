import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Mascota } from '../../../../models/mascotas.model';
import { MascotaService } from '../../../../services/mascotas';


@Component({
  selector: 'app-editar-mascota',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './editar-mascota.html',
  styleUrl: '../crear-mascota/crear-mascota.css',
})
export class EditarMascota implements OnInit {
  idMascota!: number;

  mascota: Mascota = {
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mascotaService: MascotaService
  ) { }

  ngOnInit() {
    // Obtenemos el ID de la mascota desde la ruta
    this.idMascota = Number(this.route.snapshot.paramMap.get('id'));

    // Cargamos los datos actuales de la mascota
    this.mascotaService.obtenerMascotaPorId(this.idMascota).subscribe({
      next: (data) => {
        this.mascota = { ...data };
        if (data.foto) this.fotoPreview = data.foto;
      },
      error: (err) => {
        alert('No se encontró la mascota');
        this.router.navigate(['/mascotas']);
      }
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
      this.mascota.foto = this.fotoPreview;
    };
    reader.readAsDataURL(file);
  }

  quitarFoto() {
    this.fotoPreview = null;
    this.mascota.foto = undefined;
  }

  actualizarMascota() {
    this.mascotaService.actualizarMascota(this.idMascota, this.mascota).subscribe({
      next: () => {
        this.router.navigate(['/mascotas']);
      },
      error: (err) => {
        console.error(err);
        alert('Error al actualizar la mascota');
      }
    });
  }
}
