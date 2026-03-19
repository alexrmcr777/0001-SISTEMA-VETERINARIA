import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DuenoService } from '../../../../services/duenos';
import { Dueno } from '../../../../models/duenos.model';

@Component({
  selector: 'app-duenos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './duenos-component.html',
  styleUrls: ['./duenos-component.css'],
})
export class DuenosComponent implements OnInit {
  duenos: Dueno[] = [];
  filtros = { nombre: '', telefono: '', email: '' };
  isLoading = false;

  constructor(
    private duenoService: DuenoService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.onFiltrar();
  }

  onFiltrar(): void {
    this.isLoading = true;
    this.duenoService.filtrarDuenos(this.filtros).subscribe({
      next: (data) => {
        this.duenos = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  eliminarDueno(id: number | undefined) {
    if (!id) return;

    if (confirm('¿Estás seguro de que deseas eliminar este dueño?')) {
      this.duenoService.eliminarDueno(id).subscribe({
        next: (success) => {
          if (success) {
            this.onFiltrar();
            alert('Dueño eliminado correctamente');
          }
        },
        error: (err) => {
          const msg = err?.error?.message ?? 'Error al eliminar el dueño';
          alert(msg);
        }
      });
    }
  }
}