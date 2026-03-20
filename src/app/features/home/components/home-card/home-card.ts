import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-home-card',
  standalone: true,
  imports: [],
  templateUrl: './home-card.html',
  styleUrl: './home-card.css',
})
export class HomeCard {
  @Input() title: string = '';
  @Input() body: string | number = '';
  @Input() cardColor: string = '#7F00E0';
  @Input() icon: string = '';

  private sanitizer = inject(DomSanitizer);

  get safeIcon(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.icon);
  }
}
