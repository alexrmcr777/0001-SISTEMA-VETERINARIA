import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConsultasService } from '../../../../services/consultas';
import { MascotaService } from '../../../../services/mascotas';
import { AuthService } from '../../../../services/auth';
import { Consulta } from '../../../../models/consultas.model';
import { Mascota } from '../../../../models/mascotas.model';

@Component({
  selector: 'app-editar-consulta',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './editar-consulta.html',
  styleUrl: './editar-consulta.css',
})
export class EditarConsulta implements OnInit {
  mascotas: Mascota[] = [];
  consulta?: Consulta;
  loading = false;
  errorMsg = '';
  notFound = false;

  // Form fields
  id_mascota: number | '' = '';
  fecha = '';
  hora = '';
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
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.mascotaService.obtenerMascotas().subscribe(m => (this.mascotas = m));
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.consultasService.getById(id).subscribe({
      next: c => { this.consulta = c; this.llenarFormulario(c); },
      error: () => { this.notFound = true; }
    });
  }

  private llenarFormulario(c: Consulta) {
    this.id_mascota = c.id_mascota;
    this.fecha = c.fecha;
    this.hora = c.hora;
    this.motivo_consulta = c.motivo_consulta;
    this.peso = c.peso_kg ?? '';
    this.temperatura = c.temperatura_c ?? '';
    this.frecuencia_cardiaca = c.frecuencia_cardiaca ?? '';
    this.frecuencia_respiratoria = c.frecuencia_respiratoria ?? '';
    this.diagnostico = c.diagnostico;
    this.tratamiento = c.tratamiento ?? '';
    this.medicamentos = c.medicamentos ?? '';
    this.proxima_cita = c.proxima_cita ?? '';
    this.observaciones = c.observaciones ?? '';
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
    if (!this.consulta) return;

    this.loading = true;
    this.consultasService.actualizar(this.consulta!.id_consulta, {
      id_mascota: Number(this.id_mascota),
      nombre_mascota: this.mascotaSeleccionada?.nombre ?? this.consulta!.nombre_mascota,
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
        this.loading = false;
        this.router.navigate(['/consultas']);
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Error al guardar. Intenta de nuevo.';
      }
    });
  }
}
