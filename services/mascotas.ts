import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Mascota } from '../models/mascotas.model';
import { ReportesService } from './reportes';
import { DashboardService } from './dashboard';

@Injectable({ providedIn: 'root' })
export class MascotaService {
  private http = inject(HttpClient);
  private reportesService = inject(ReportesService);
  private dashboardService = inject(DashboardService);
  private _mascotas$ = new BehaviorSubject<Mascota[]>([]);

  constructor() { this.refresh(); }

  private refresh(): void {
    this.http.get<Mascota[]>('/api/mascotas').subscribe({
      next: data => this._mascotas$.next(data),
      error: err => console.error('[MascotaService]', err)
    });
  }

  obtenerMascotas(): Observable<Mascota[]> {
    return this._mascotas$.asObservable();
  }

  obtenerMascotaPorId(id: number): Observable<Mascota> {
    return this.http.get<Mascota>(`/api/mascotas/${id}`);
  }

  crearMascota(mascota: Mascota): Observable<any> {
    return this.http.post<any>('/api/mascotas', mascota).pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  actualizarMascota(id: number, datos: Mascota): Observable<any> {
    return this.http.put<any>(`/api/mascotas/${id}`, datos).pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  eliminarMascota(id: number): Observable<any> {
    return this.http.delete<any>(`/api/mascotas/${id}`).pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  filtrarMascotas(filtros: any): Observable<Mascota[]> {
    const params: string[] = [];
    if (filtros.nombre)   params.push(`nombre=${encodeURIComponent(filtros.nombre)}`);
    if (filtros.dueno)    params.push(`dueno=${encodeURIComponent(filtros.dueno)}`);
    const query = params.length ? '?' + params.join('&') : '';
    return this.http.get<Mascota[]>(`/api/mascotas${query}`);
  }
}