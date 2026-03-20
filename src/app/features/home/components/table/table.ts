import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cita } from '../../../../models/citas.model';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.html',
  styleUrls: ['./table.css'],
})
export class TableComponent {
  @Input() citas: Cita[] = [];
}