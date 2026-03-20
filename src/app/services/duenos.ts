import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Dueno } from '../models/duenos.model';
import { ReportesService } from './reportes';
import { DashboardService } from './dashboard';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class DuenoService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private reportesService = inject(ReportesService);
  private dashboardService = inject(DashboardService);
  private _duenos$ = new BehaviorSubject<Dueno[]>([]);

  constructor() {
    if (this.auth.isLoggedIn()) this.refresh();
  }

  private refresh(): void {
    this.http.get<Dueno[]>('/api/duenos').subscribe({
      next: data => this._duenos$.next(data),
      error: err => console.error('[DuenoService]', err)
    });
  }

  obtenerDuenos(): Observable<Dueno[]> {
    return this._duenos$.asObservable();
  }

  obtenerDuenoPorId(id: number): Observable<Dueno> {
    return this.http.get<Dueno>(`/api/duenos/${id}`);
  }

  crearDueno(dueno: Dueno): Observable<any> {
    return this.http.post<any>('/api/duenos', dueno).pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  actualizarDueno(id: number, datos: Dueno): Observable<any> {
    return this.http.put<any>(`/api/duenos/${id}`, datos).pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  eliminarDueno(id: number): Observable<any> {
    return this.http.delete<any>(`/api/duenos/${id}`).pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  filtrarDuenos(filtros: any): Observable<Dueno[]> {
    return this._duenos$.pipe(
      map(duenos => {
        let filtrados = [...duenos];
        if (filtros.nombre)   filtrados = filtrados.filter(d => d.nombre.toLowerCase().includes(filtros.nombre.toLowerCase()));
        if (filtros.telefono) filtrados = filtrados.filter(d => (d.telefono ?? '').includes(filtros.telefono));
        if (filtros.email)    filtrados = filtrados.filter(d => (d.email ?? '').toLowerCase().includes(filtros.email.toLowerCase()));
        return filtrados;
      })
    );
  }
}