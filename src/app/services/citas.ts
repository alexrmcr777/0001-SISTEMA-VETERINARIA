import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Cita } from '../models/citas.model';
import { ReportesService } from './reportes';
import { DashboardService } from './dashboard';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class CitaService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private reportesService = inject(ReportesService);
  private dashboardService = inject(DashboardService);
  private _citas$ = new BehaviorSubject<Cita[]>([]);
  private _loaded = false;

  constructor() {
    if (this.auth.isLoggedIn()) this.refresh();
  }

  private refresh(): void {
    this.http.get<Cita[]>('/api/citas').subscribe({
      next: data => this._citas$.next(data),
      error: err => console.error('[CitaService]', err)
    });
  }

  obtenerCitas(): Observable<Cita[]> {
    return this._citas$.asObservable();
  }

  obtenerCitaPorId(id: number): Observable<Cita> {
    return this.http.get<Cita>(`/api/citas/${id}`);
  }

  crearCita(cita: Cita): Observable<any> {
    return this.http.post<any>('/api/citas', cita).pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  actualizarCita(id: number, datos: Partial<Cita>): Observable<any> {
    return this.http.put<any>(`/api/citas/${id}`, datos).pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  eliminarCita(id: number): Observable<any> {
    return this.http.delete<any>(`/api/citas/${id}`).pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  confirmarCita(id: number): Observable<any> {
    return this.http.patch<any>(`/api/citas/${id}/estado`, { estado: 'Confirmada' })
      .pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  cancelarCita(id: number): Observable<any> {
    return this.http.patch<any>(`/api/citas/${id}/estado`, { estado: 'Cancelada' })
      .pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  reprogramarCita(id: number, fecha: string, hora: string): Observable<any> {
    return this.http.patch<any>(`/api/citas/${id}/reprogramar`, { fecha, hora })
      .pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  marcarAtendida(id: number): Observable<any> {
    return this.http.patch<any>(`/api/citas/${id}/estado`, { estado: 'Atendida' })
      .pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  filtrarCitas(filtros: any): Observable<Cita[]> {
    const params: string[] = [];
    if (filtros.fecha)   params.push(`fecha=${encodeURIComponent(filtros.fecha)}`);
    if (filtros.estado)  params.push(`estado=${encodeURIComponent(filtros.estado)}`);
    if (filtros.mascota) params.push(`mascota=${encodeURIComponent(filtros.mascota)}`);
    const query = params.length ? '?' + params.join('&') : '';
    return this.http.get<Cita[]>(`/api/citas${query}`);
  }
}

