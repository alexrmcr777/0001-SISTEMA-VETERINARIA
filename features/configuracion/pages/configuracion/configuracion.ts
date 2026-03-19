import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, DaySchedule, UserAccount } from '../../../../services/auth';

type Tab = 'perfil' | 'foto' | 'horario';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css',
})
export class Configuracion implements OnInit {
  activeTab = signal<Tab>('perfil');

  // ── User data ─────────────────────────────────────
  userId = '';
  nombreCompleto = '';
  fechaNacimiento = '';
  tipoDocumento: 'dni' | 'pasaporte' | 'carnet' = 'dni';
  numeroDocumento = '';
  direccion = '';
  correo = '';
  celular = '';
  puestoTrabajo = '';

  profileMsg = '';
  profileError = '';
  profileLoading = false;

  // ── Password change ───────────────────────────────
  showPasswordSection = false;
  currentPass = '';
  newPass = '';
  confirmNewPass = '';
  showCurrentPass = false;
  showNewPass = false;
  showConfirmPass = false;
  passMsg = '';
  passError = '';

  // ── Photo ─────────────────────────────────────────
  photoPreview = '';
  photoMsg = '';

  // ── Schedule ─────────────────────────────────────
  schedule: DaySchedule[] = [];
  scheduleMsg = '';

  constructor(private auth: AuthService) {}

  ngOnInit() {
    const session = this.auth.getCurrentUser();
    if (!session) return;
    this.userId = session.id;
    this.loadUserFields(session);
    this.photoPreview = this.auth.getProfilePhoto(this.userId);
    this.schedule = this.auth.getSchedule(this.userId);
  }

  private loadUserFields(user: UserAccount) {
    this.nombreCompleto  = user.nombreCompleto;
    this.fechaNacimiento = user.fechaNacimiento;
    this.tipoDocumento   = user.tipoDocumento;
    this.numeroDocumento = user.numeroDocumento;
    this.direccion       = user.direccion;
    this.correo          = user.correo;
    this.celular         = user.celular;
    this.puestoTrabajo   = user.puestoTrabajo ?? '';
  }

  // ── Profile save ──────────────────────────────────
  saveProfile() {
    this.profileMsg = '';
    this.profileError = '';
    if (!this.nombreCompleto || !this.correo || !this.celular) {
      this.profileError = 'Nombre, correo y celular son obligatorios.';
      return;
    }
    this.profileLoading = true;
    this.auth.updateProfile(this.userId, {
      nombreCompleto:  this.nombreCompleto,
      fechaNacimiento: this.fechaNacimiento,
      tipoDocumento:   this.tipoDocumento,
      numeroDocumento: this.numeroDocumento,
      direccion:       this.direccion,
      correo:          this.correo,
      celular:         this.celular,
      puestoTrabajo:   this.puestoTrabajo,
    }).subscribe(result => {
      this.profileLoading = false;
      if (result.ok) this.profileMsg = result.message;
      else this.profileError = result.message;
    });
  }

  // ── Password change ───────────────────────────────
  passwordStrength(pass: string): { level: string; score: number } {
    if (!pass) return { level: '', score: 0 };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (score <= 1) return { level: 'Débil',      score: 1 };
    if (score <= 2) return { level: 'Media',      score: 2 };
    if (score <= 3) return { level: 'Fuerte',     score: 3 };
    return           { level: 'Muy fuerte',  score: 4 };
  }

  changePassword() {
    this.passMsg = '';
    this.passError = '';
    if (!this.currentPass) {
      this.passError = 'Ingresa tu contraseña actual.';
      return;
    }
    if (this.newPass.length < 8) {
      this.passError = 'La nueva contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.newPass !== this.confirmNewPass) {
      this.passError = 'Las contraseñas no coinciden.';
      return;
    }
    this.auth.changePassword(this.userId, this.currentPass, this.newPass).subscribe(result => {
      if (result.ok) {
        this.passMsg = result.message;
        this.currentPass = '';
        this.newPass = '';
        this.confirmNewPass = '';
        this.showPasswordSection = false;
      } else {
        this.passError = result.message;
      }
    });
  }

  // ── Photo ─────────────────────────────────────────
  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.photoMsg = 'La imagen no debe superar 2 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.photoPreview = e.target?.result as string;
      this.photoMsg = '';
    };
    reader.readAsDataURL(file);
  }

  savePhoto() {
    if (!this.photoPreview) return;
    this.auth.saveProfilePhoto(this.userId, this.photoPreview);
    this.photoMsg = 'Foto actualizada correctamente.';
  }

  removePhoto() {
    this.photoPreview = '';
    this.auth.saveProfilePhoto(this.userId, '');
    this.photoMsg = 'Foto eliminada.';
  }

  // ── Schedule ──────────────────────────────────────
  saveSchedule() {
    this.auth.saveSchedule(this.userId, this.schedule);
    this.scheduleMsg = 'Horario guardado correctamente.';
    setTimeout(() => this.scheduleMsg = '', 2500);
  }

  readonly puestos = [
    { value: 'medico_veterinario', label: 'Médico Veterinario' },
    { value: 'recepcionista',      label: 'Recepcionista' },
    { value: 'asesor_ventas',      label: 'Asesor de Ventas' },
    { value: 'tecnico_estetica',   label: 'Técnico en Estética' },
    { value: 'conductor',          label: 'Conductor' },
  ];
}
