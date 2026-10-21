import { Component, inject } from '@angular/core';
import { Theme } from '../../services/theme';

@Component({
  selector: 'app-theme-toggle',
  styleUrl: './theme-toggle.css',
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  protected readonly theme = inject(Theme);
}
