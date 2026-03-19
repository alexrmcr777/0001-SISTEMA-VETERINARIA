import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  // ── Fields ──────────────────────────────────────────
  nombreCompleto = '';
  fechaNacimiento = '';
  tipoDocumento: 'dni' | 'pasaporte' | 'carnet' = 'dni';
  numeroDocumento = '';
  direccion = '';
  correo = '';
  celular = '';
  puestoTrabajo = '';
  password = '';
  confirmPassword = '';

  showPass = false;
  showConfirm = false;
  errorMsg = '';
  successMsg = '';
  loading = false;

  docLabels: Record<string, string> = {
    dni: 'DNI',
    pasaporte: 'Pasaporte',
    carnet: 'Carnet de Extranjería',
  };

  constructor(private auth: AuthService, private router: Router) {}

  passwordStrength(pass: string): { level: string; score: number } {
    if (!pass) return { level: '', score: 0 };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (score <= 1) return { level: 'Débil', score: 1 };
    if (score <= 3) return { level: 'Media', score: 2 };
    return { level: 'Fuerte', score: 3 };
  }

  onSubmit() {
    this.errorMsg = '';
    if (!this.nombreCompleto || !this.fechaNacimiento || !this.numeroDocumento ||
        !this.direccion || !this.correo || !this.celular || !this.puestoTrabajo || !this.password) {
      this.errorMsg = 'Completa todos los campos obligatorios.';
      return;
    }
    if (this.password.length < 8) {
      this.errorMsg = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;
    this.auth.register({
      nombreCompleto: this.nombreCompleto,
      fechaNacimiento: this.fechaNacimiento,
      tipoDocumento: this.tipoDocumento,
      numeroDocumento: this.numeroDocumento,
      direccion: this.direccion,
      correo: this.correo,
      celular: this.celular,
      puestoTrabajo: this.puestoTrabajo,
      password: this.password,
    }).subscribe(result => {
      this.loading = false;
      if (result.ok) {
        this.successMsg = '¡Cuenta creada! Redirigiendo al inicio de sesión...';
        setTimeout(() => this.router.navigate(['/auth/login']), 1800);
      } else {
        this.errorMsg = result.message;
      }
    });
  }
}
