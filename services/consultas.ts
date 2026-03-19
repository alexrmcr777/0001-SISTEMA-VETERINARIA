import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Consulta } from '../models/consultas.model';
import { ReportesService } from './reportes';
import { DashboardService } from './dashboard';

@Injectable({ providedIn: 'root' })
export class ConsultasService {
  private http = inject(HttpClient);
  private reportesService = inject(ReportesService);
  private dashboardService = inject(DashboardService);
  private _consultas$ = new BehaviorSubject<Consulta[]>([]);

  constructor() { this.refresh(); }

  private refresh(): void {
    this.http.get<Consulta[]>('/api/consultas').subscribe({
      next: data => this._consultas$.next(data),
      error: err => console.error('[ConsultasService]', err)
    });
  }

  obtenerConsultas(): Observable<Consulta[]> {
    return this._consultas$.asObservable();
  }

  getAll(): Consulta[] {
    return this._consultas$.getValue();
  }

  getById(id: number): Observable<Consulta> {
    return this.http.get<Consulta>(`/api/consultas/${id}`);
  }

  getByMascota(id_mascota: number): Consulta[] {
    return this._consultas$.getValue()
      .filter(c => c.id_mascota === id_mascota)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  crear(data: Omit<Consulta, 'id_consulta'>): Observable<any> {
    return this.http.post<any>('/api/consultas', data)
      .pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  actualizar(id: number, data: Partial<Consulta>): Observable<any> {
    return this.http.put<any>(`/api/consultas/${id}`, data)
      .pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`/api/consultas/${id}`)
      .pipe(tap(() => { this.refresh(); this.reportesService.clearAll(); this.dashboardService.notificarCambio(); }));
  }
}




