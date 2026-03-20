import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

export interface ReporteResumen {
  periodo: { desde: string; hasta: string };
  citas: {
    total: number;
    atendidas: number;
    confirmadas: number;
    programadas: number;
    canceladas: number;
    no_asistio: number;
    por_estado: { estado: string; cantidad: number }[];
  };
  consultas: { total: number };
  pacientes: { total_mascotas: number; total_duenos: number };
  top_veterinarios: { nombre: string; consultas: number }[];
}

export interface ReporteCita {
  id_cita: number;
  fecha: string;
  hora: string;
  mascota: string;
  dueno: string;
  veterinario: string;
  motivo: string;
  estado: string;
  comentarios: string;
}

export interface ReporteConsulta {
  id_consulta: number;
  fecha: string;
  mascota: string;
  dueno: string;
  veterinario: string;
  motivo: string;
  diagnostico: string;
  tratamiento: string;
  observaciones: string;
  peso_kg: number;
  temperatura_c: number;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);

  // In-memory cache: key = "tipo|desde|hasta"
  private cache = new Map<string, any>();

  private key(tipo: string, desde: string, hasta: string) {
    return `${tipo}|${desde}|${hasta}`;
  }

  private get$<T>(tipo: string, desde: string, hasta: string): Observable<T> {
    const k = this.key(tipo, desde, hasta);
    const cached = this.cache.get(k);
    if (cached) return of(cached as T);
    return this.http.get<T>(`/api/reportes?tipo=${tipo}&desde=${desde}&hasta=${hasta}`).pipe(
      tap(data => this.cache.set(k, data))
    );
  }

  getResumen(desde: string, hasta: string): Observable<ReporteResumen> {
    return this.get$<ReporteResumen>('resumen', desde, hasta);
  }

  getCitas(desde: string, hasta: string): Observable<ReporteCita[]> {
    return this.get$<ReporteCita[]>('citas', desde, hasta);
  }

  getConsultas(desde: string, hasta: string): Observable<ReporteConsulta[]> {
    return this.get$<ReporteConsulta[]>('consultas', desde, hasta);
  }

  /** Pre-fetch citas + consultas silently so tab switches are instant */
  prefetch(desde: string, hasta: string): void {
    this.getCitas(desde, hasta).subscribe();
    this.getConsultas(desde, hasta).subscribe();
  }

  /** Clear cached data for a period (call when data may have changed) */
  invalidate(desde: string, hasta: string): void {
    ['resumen', 'citas', 'consultas'].forEach(t => this.cache.delete(this.key(t, desde, hasta)));
  }

  /** Clear the entire cache (call after any data mutation) */
  clearAll(): void {
    this.cache.clear();
  }
}
