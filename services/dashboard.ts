import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { debounceTime, filter, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  private _datos$ = new BehaviorSubject<any>(null);
  private _refreshTrigger$ = new Subject<{ desde: string; hasta: string }>();

  /** Emit whenever fresh data arrives — replays last value to new subscribers */
  readonly datos$: Observable<any> = this._datos$.pipe(
    filter((v): v is any => v !== null)
  );

  constructor() {
    // Debounce rapid consecutive refresh calls into a single API request
    this._refreshTrigger$.pipe(
      debounceTime(300),
      switchMap(({ desde, hasta }) => this.http.get<any>(`/api/dashboard?desde=${desde}&hasta=${hasta}`))
    ).subscribe({
      next: d => this._datos$.next(d),
      error: e => console.error('[DashboardService]', e)
    });
    this.notificarCambio();
  }

  /**
   * Re-fetches from the API and pushes fresh data to all active subscribers.
   * Pass optional desde/hasta to filter by period (defaults to today).
   */
  notificarCambio(desde?: string, hasta?: string): void {
    const today = new Date().toISOString().split('T')[0];
    this._refreshTrigger$.next({ desde: desde ?? today, hasta: hasta ?? today });
  }

  /** One-time direct HTTP fetch for a given period */
  obtenerDashboard(desde?: string, hasta?: string): Observable<any> {
    const today = new Date().toISOString().split('T')[0];
    const d = desde ?? today;
    const h = hasta ?? today;
    return this.http.get<any>(`/api/dashboard?desde=${d}&hasta=${h}`);
  }
}

