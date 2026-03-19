import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../services/auth';
import { CommonModule } from '@angular/common';

type View = 'login' | 'forgot-contact' | 'forgot-code' | 'forgot-newpass';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  view = signal<View>('login');

  // ── Login ──────────────────────────────────────────
  correo = '';
  password = '';
  showPass = false;
  loginError = '';
  loginLoading = false;

  // ── Forgot ─────────────────────────────────────────
  recoveryContact = '';
  recoveryMethod: 'correo' | 'celular' = 'correo';
  recoveryCode = '';
  codeError = '';
  contactError = '';
  recoveryUserId = '';
  sendingCode  = false;
  verifyingCode = false;

  // ── New Password ───────────────────────────────────
  newPass = '';
  confirmNewPass = '';
  showNewPass = false;
  showConfirmNewPass = false;
  newPassError = '';
  newPassSuccess = '';

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    this.loginError = '';
    if (!this.correo || !this.password) {
      this.loginError = 'Completa todos los campos.';
      return;
    }
    this.loginLoading = true;
    this.auth.login(this.correo, this.password).subscribe({
      next: (result) => {
        this.loginLoading = false;
        if (result.ok) {
          this.router.navigate(['/']);
        } else {
          this.loginError = result.message;
        }
      },
      error: () => {
        this.loginLoading = false;
        this.loginError = 'Error al conectar con el servidor.';
      }
    });
  }

  sendRecoveryCode() {
    this.contactError = '';
    if (!this.recoveryContact.trim()) {
      this.contactError = 'Ingresa un correo o número de celular.';
      return;
    }
    this.sendingCode = true;
    this.auth.requestRecoveryCode(this.recoveryContact.trim(), this.recoveryMethod).subscribe({
      next: (result) => {
        this.sendingCode = false;
        if (result.ok) {
          this.view.set('forgot-code');
        } else {
          this.contactError = result.message;
        }
      },
      error: () => {
        this.sendingCode = false;
        this.contactError = 'Error al conectar con el servidor.';
      }
    });
  }

  verifyCode() {
    this.codeError = '';
    if (!this.recoveryCode.trim()) {
      this.codeError = 'Ingresa el código.';
      return;
    }
    this.verifyingCode = true;
    this.auth.verifyRecoveryCode(this.recoveryContact.trim(), this.recoveryMethod, this.recoveryCode.trim()).subscribe({
      next: (result) => {
        this.verifyingCode = false;
        if (!result.ok) {
          this.codeError = 'Código incorrecto. Intenta de nuevo.';
          return;
        }
        this.recoveryUserId = result.contact;
        this.view.set('forgot-newpass');
      },
      error: () => {
        this.verifyingCode = false;
        this.codeError = 'Error al verificar el código.';
      }
    });
  }

  saveNewPassword() {
    this.newPassError = '';
    if (this.newPass.length < 8) {
      this.newPassError = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.newPass !== this.confirmNewPass) {
      this.newPassError = 'Las contraseñas no coinciden.';
      return;
    }
    // recoveryUserId holds the correo (contact) after verifyCode
    this.auth.resetPassword(this.recoveryUserId, this.newPass).subscribe({
      next: (result) => {
        if (result.ok) {
          this.newPassSuccess = '¡Contraseña actualizada! Redirigiendo...';
          setTimeout(() => this.view.set('login'), 1800);
        } else {
          this.newPassError = 'Error al actualizar la contraseña.';
        }
      },
      error: () => { this.newPassError = 'Error al actualizar la contraseña.'; }
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
    if (score <= 1) return { level: 'Débil', score: 1 };
    if (score <= 3) return { level: 'Media', score: 2 };
    return { level: 'Fuerte', score: 3 };
  }
}
