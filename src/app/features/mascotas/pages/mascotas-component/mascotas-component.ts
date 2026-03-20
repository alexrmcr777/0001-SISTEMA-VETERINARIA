import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { MascotaService } from '../../../../services/mascotas';
import { Mascota } from '../../../../models/mascotas.model';

@Component({
  selector: 'app-mascotas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mascotas-component.html',
  styleUrls: ['./mascotas-component.css'],
})
export class MascotasComponent implements OnInit {
  mascotas: Mascota[] = [];
  filtros = { nombre: '', dueno: '', telefono: '' };
  isLoading = false;

  private filterSubject$ = new Subject<void>();
  private destroyRef = inject(DestroyRef);

  constructor(
    private mascotaService: MascotaService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.filterSubject$.pipe(
      debounceTime(300),
      switchMap(() => {
        this.isLoading = true;
        return this.mascotaService.filtrarMascotas(this.filtros);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (data) => {
        this.mascotas = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
    this.onFiltrar();
    // Pre-fill dueño filter from query params (e.g. when navigating from Dueños → Ver mascotas)
    const params = this.route.snapshot.queryParams;
    if (params['dueno']) {
      this.filtros.dueno = params['dueno'];
      this.onFiltrar();
    }
  }

  onFiltrar(): void {
    this.filterSubject$.next();
  }

  eliminarMascota(id: number | undefined) {
    if (!id) return;
    if (!confirm('¿Estás seguro de que deseas eliminar esta mascota?')) return;
    this.mascotaService.eliminarMascota(id).subscribe({
      next: () => {
        this.onFiltrar();
        alert('Mascota eliminada correctamente');
      },
      error: () => alert('Error al eliminar la mascota')
    });
  }
}
