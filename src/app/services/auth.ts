import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';

export interface DaySchedule {
  day: string;
  active: boolean;
  start: string;
  end: string;
}

export interface UserAccount {
  id: string;
  nombreCompleto: string;
  fechaNacimiento: string;
  tipoDocumento: 'dni' | 'pasaporte' | 'carnet';
  numeroDocumento: string;
  direccion: string;
  correo: string;
  celular: string;
  puestoTrabajo: string;
  token?: string; // JWT token — present after login, stored in session
}

const SESSION_KEY = 'vet_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private http = inject(HttpClient);

  private _isLoggedIn = signal<boolean>(this.checkSession());
  readonly isLoggedIn = this._isLoggedIn.asReadonly();

  private checkSession(): boolean {
    if (!this.isBrowser) return false;
    return !!localStorage.getItem(SESSION_KEY);
  }

  getUsers(): Observable<UserAccount[]> {
    return this.http.get<any[]>('/api/auth/usuarios').pipe(
      map(users => users as UserAccount[])
    );
  }

  register(data: { nombreCompleto: string; fechaNacimiento: string; tipoDocumento: string; numeroDocumento: string; direccion: string; correo: string; celular: string; puestoTrabajo: string; password: string; }): Observable<{ ok: boolean; message: string }> {
    return this.http.post<any>('/api/auth/usuarios', data).pipe(
      map(r => ({ ok: true, message: r.message || 'Cuenta creada correctamente.' })),
      catchError(err => of({ ok: false, message: err.error?.message || 'Error al crear la cuenta.' }))
    );
  }

  login(correo: string, password: string): Observable<{ ok: boolean; message: string }> {
    return this.http.post<UserAccount>('/api/auth/login', { correo, password }).pipe(
      tap(user => {
        if (this.isBrowser) {
          const session = { ...user, nombre: user.nombreCompleto };
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
        this._isLoggedIn.set(true);
      }),
      map(user => ({ ok: true, message: 'Bienvenido, ' + user.nombreCompleto })),
      catchError(err => of({ ok: false, message: err.error?.message || 'Correo o contraseña incorrectos.' }))
    );
  }

  logout(): void {
    if (this.isBrowser) localStorage.removeItem(SESSION_KEY);
    this._isLoggedIn.set(false);
  }

  getCurrentUser(): (UserAccount & { nombre: string }) | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p.puestoTrabajo) return null;
    return p;
  }

  /** Simulated password recovery — generates a 6-digit demo code */
  /** Step 1: request a recovery code — server sends it via email. */
  requestRecoveryCode(contact: string, method: 'correo' | 'celular' = 'correo'): Observable<{ ok: boolean; message: string }> {
    return this.http.post<any>('/api/auth/recovery-request', { contact, method }).pipe(
      map(r  => ({ ok: true,  message: r.message || 'Código enviado.' })),
      catchError(err => of({ ok: false, message: err.error?.message || 'Error al enviar el código.' }))
    );
  }

  /** Step 2: verify the code — server returns a one-time resetToken on success. */
  verifyRecoveryCode(contact: string, method: 'correo' | 'celular', inputCode: string): Observable<{ ok: boolean; contact: string }> {
    return this.http.post<any>('/api/auth/recovery-verify', { contact, method, code: inputCode }).pipe(
      tap(r => {
        if (r.ok && this.isBrowser) {
          sessionStorage.setItem('vet_recovery', JSON.stringify({ resetToken: r.resetToken }));
        }
      }),
      map(r  => ({ ok: r.ok, contact: r.contact || '' })),
      catchError(() => of({ ok: false, contact: '' }))
    );
  }

  /** Step 3: reset the password using the one-time resetToken obtained in step 2. */
  resetPassword(_correo: string, newPassword: string): Observable<{ ok: boolean }> {
    const raw = this.isBrowser ? sessionStorage.getItem('vet_recovery') : null;
    const resetToken = raw ? JSON.parse(raw).resetToken : '';
    return this.http.post<any>('/api/auth/password-reset', { resetToken, newPassword }).pipe(
      tap(() => { if (this.isBrowser) sessionStorage.removeItem('vet_recovery'); }),
      map(() => ({ ok: true })),
      catchError(() => of({ ok: false }))
    );
  }

  updateProfile(userId: string, data: Partial<Omit<UserAccount, 'id'>>): Observable<{ ok: boolean; message: string }> {
    return this.http.put<any>(`/api/auth/usuarios/${userId}`, {
      nombreCompleto:  data.nombreCompleto,
      fechaNacimiento: data.fechaNacimiento,
      tipoDocumento:   data.tipoDocumento,
      numeroDocumento: data.numeroDocumento,
      direccion:       data.direccion,
      correo:          data.correo,
      celular:         data.celular,
      puestoTrabajo:   data.puestoTrabajo,
    }).pipe(
      tap(r => {
        if (r.user && this.isBrowser) {
          const current = this.getCurrentUser();
          const session = { ...r.user, nombre: r.user.nombreCompleto, token: current?.token };
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
      }),
      map(r => ({ ok: true, message: r.message || 'Perfil actualizado correctamente.' })),
      catchError(err => of({ ok: false, message: err.error?.message || 'Error al actualizar perfil.' }))
    );
  }

  /** Returns the current session user if it matches the given ID, or undefined otherwise. */
  getUserById(userId: string): UserAccount | undefined {
    const session = this.getCurrentUser();
    if (session && session.id === userId) return session;
    return undefined;
  }

  /** Change password with current password verification (for profile settings) */
  changePassword(userId: string, currentPass: string, newPass: string): Observable<{ ok: boolean; message: string }> {
    return this.http.post<any>(`/api/auth/usuarios/${userId}/password`, {
      currentPassword: currentPass,
      newPassword: newPass,
    }).pipe(
      map(r => ({ ok: true, message: r.message || 'Contraseña actualizada.' })),
      catchError(err => of({ ok: false, message: err.error?.message || 'Error al cambiar contraseña.' }))
    );
  }

  /** Send a 6-digit verification code to the user's email or phone */
  sendChangeCode(userId: string, method: 'correo' | 'celular'): Observable<{ ok: boolean; message: string; maskedContact?: string }> {
    return this.http.post<any>(`/api/auth/usuarios/${userId}/send-change-code`, { method }).pipe(
      map(r => ({ ok: true, message: r.message || 'Código enviado.', maskedContact: r.maskedContact })),
      catchError(err => of({ ok: false, message: err.error?.message || 'Error al enviar el código.' }))
    );
  }

  /** Verify the 6-digit code and receive a one-time changeToken */
  verifyChangeCode(userId: string, code: string): Observable<{ ok: boolean; message: string; changeToken?: string }> {
    return this.http.post<any>(`/api/auth/usuarios/${userId}/verify-change-code`, { code }).pipe(
      map(r => ({ ok: r.ok, message: r.message || '', changeToken: r.changeToken })),
      catchError(err => of({ ok: false, message: err.error?.message || 'Error al verificar el código.' }))
    );
  }

  /** Change password using the verified one-time changeToken */
  changePasswordWithToken(userId: string, changeToken: string, newPassword: string): Observable<{ ok: boolean; message: string }> {
    return this.http.post<any>(`/api/auth/usuarios/${userId}/password-with-token`, { changeToken, newPassword }).pipe(
      map(r => ({ ok: true, message: r.message || 'Contraseña actualizada correctamente.' })),
      catchError(err => of({ ok: false, message: err.error?.message || 'Error al actualizar la contraseña.' }))
    );
  }

  // ── Profile photo (stored as base64 per user) ──
  getProfilePhoto(userId: string): string {
    if (!this.isBrowser) return '';
    return localStorage.getItem(`vet_photo_${userId}`) ?? '';
  }

  saveProfilePhoto(userId: string, base64: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem(`vet_photo_${userId}`, base64);
    this._profilePhoto.set(base64);
  }

  private _profilePhoto = signal<string>(this.loadCurrentPhoto());
  readonly profilePhoto = this._profilePhoto.asReadonly();

  private loadCurrentPhoto(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return '';
    const { id } = JSON.parse(raw);
    return localStorage.getItem(`vet_photo_${id}`) ?? '';
  }

  // ── Schedule ──
  readonly DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  getSchedule(userId: string): DaySchedule[] {
    if (!this.isBrowser) return this.defaultSchedule();
    const raw = localStorage.getItem(`vet_schedule_${userId}`);
    return raw ? JSON.parse(raw) : this.defaultSchedule();
  }

  saveSchedule(userId: string, schedule: DaySchedule[]): void {
    if (!this.isBrowser) return;
    localStorage.setItem(`vet_schedule_${userId}`, JSON.stringify(schedule));
  }

  private defaultSchedule(): DaySchedule[] {
    return this.DAYS.map((day, i) => ({
      day,
      active: i < 5,
      start: '08:00',
      end: '18:00',
    }));
  }

  hash(value: string): string {
    // Simple deterministic hash for demo (NOT for production)
    let h = 0;
    for (let i = 0; i < value.length; i++) {
      h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
    }
    return h.toString(36);
  }
}
