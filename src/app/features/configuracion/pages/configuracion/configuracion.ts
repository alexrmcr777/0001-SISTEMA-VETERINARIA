import { Component, OnInit, OnDestroy, signal, ChangeDetectorRef, inject } from '@angular/core';
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
export class Configuracion implements OnInit, OnDestroy {
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
  // Step 1: choose method  |  Step 2: enter code  |  Step 3: enter new password
  passStep: 1 | 2 | 3 = 1;
  passMethod: 'correo' | 'celular' = 'correo';
  maskedContact = '';
  verifyCode = '';
  changeToken = '';
  currentPass = '';
  newPass = '';
  confirmNewPass = '';
  showCurrentPass = false;
  showNewPass = false;
  showConfirmPass = false;
  passMsg = '';
  passError = '';
  passLoading = false;
  codeResendCooldown = 0;
  private _cooldownTimer: ReturnType<typeof setInterval> | null = null;

  // ── Photo ─────────────────────────────────────────
  photoPreview = '';
  photoMsg = '';

  // ── Schedule ─────────────────────────────────────
  schedule: DaySchedule[] = [];
  scheduleMsg = '';

  private auth = inject(AuthService);
  private cdr  = inject(ChangeDetectorRef);

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

  // ── Password change — 3-step flow ────────────────
  openPasswordSection() {
    this.showPasswordSection = !this.showPasswordSection;
    if (!this.showPasswordSection) this._resetPassFlow();
  }

  private _resetPassFlow() {
    this.passStep = 1;
    this.passMethod = 'correo';
    this.maskedContact = '';
    this.verifyCode = '';
    this.changeToken = '';
    this.currentPass = '';
    this.newPass = '';
    this.confirmNewPass = '';
    this.passMsg = '';
    this.passError = '';
    this.passLoading = false;
    if (this._cooldownTimer) { clearInterval(this._cooldownTimer); this._cooldownTimer = null; }
    this.codeResendCooldown = 0;
  }

  /** Step 1 → Step 2: send code */
  sendCode() {
    this.passError = '';
    this.passLoading = true;
    this.auth.sendChangeCode(this.userId, this.passMethod).subscribe(r => {
      this.passLoading = false;
      if (r.ok) {
        this.maskedContact = r.maskedContact ?? '';
        this.passStep = 2;
        this._startCooldown(60);
      } else {
        this.passError = r.message;
      }
    });
  }

  /** Resend code from step 2 */
  resendCode() {
    if (this.codeResendCooldown > 0) return;
    this.passError = '';
    this.verifyCode = '';
    this.passLoading = true;
    this.auth.sendChangeCode(this.userId, this.passMethod).subscribe(r => {
      this.passLoading = false;
      if (r.ok) {
        this.maskedContact = r.maskedContact ?? '';
        this._startCooldown(60);
      } else {
        this.passError = r.message;
      }
    });
  }

  private _startCooldown(seconds: number) {
    this.codeResendCooldown = seconds;
    if (this._cooldownTimer) clearInterval(this._cooldownTimer);
    this._cooldownTimer = setInterval(() => {
      this.codeResendCooldown--;
      this.cdr.markForCheck(); // zoneless: trigger change detection manually
      if (this.codeResendCooldown <= 0) {
        clearInterval(this._cooldownTimer!);
        this._cooldownTimer = null;
        this.cdr.markForCheck();
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this._cooldownTimer) {
      clearInterval(this._cooldownTimer);
      this._cooldownTimer = null;
    }
  }

  /** Step 2 → Step 3: verify code */
  verifyCodeStep() {
    this.passError = '';
    if (!this.verifyCode || this.verifyCode.length !== 6) {
      this.passError = 'Ingresa el código de 6 dígitos.';
      return;
    }
    this.passLoading = true;
    this.auth.verifyChangeCode(this.userId, this.verifyCode).subscribe(r => {
      this.passLoading = false;
      if (r.ok && r.changeToken) {
        this.changeToken = r.changeToken;
        this.passStep = 3;
      } else {
        this.passError = r.message || 'Código incorrecto.';
      }
    });
  }

  /** Step 3: set new password */
  changePassword() {
    this.passMsg = '';
    this.passError = '';
    if (this.newPass.length < 8) {
      this.passError = 'La nueva contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.newPass !== this.confirmNewPass) {
      this.passError = 'Las contraseñas no coinciden.';
      return;
    }
    this.passLoading = true;
    this.auth.changePasswordWithToken(this.userId, this.changeToken, this.newPass).subscribe(result => {
      this.passLoading = false;
      if (result.ok) {
        this.passMsg = result.message;
        setTimeout(() => {
          this.showPasswordSection = false;
          this._resetPassFlow();
        }, 2000);
      } else {
        this.passError = result.message;
      }
    });
  }

  passwordStrength(pass: string): { level: string; score: number } {
    if (!pass) return { level: '', score: 0 };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (score <= 1) return { level: 'Débil',  score: 1 };
    if (score <= 2) return { level: 'Media',  score: 2 };
    if (score <= 3) return { level: 'Fuerte', score: 3 };
    return           { level: 'Muy fuerte', score: 4 };
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
