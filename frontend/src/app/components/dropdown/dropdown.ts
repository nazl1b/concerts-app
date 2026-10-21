import { Component, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';

// How long after the mouse leaves before the dropdown closes.
const CLOSE_DELAY_MS = 1000;

@Component({
  selector: 'app-dropdown',
  styleUrl: './dropdown.css',
  templateUrl: './dropdown.html',
  // The "host" is the <app-dropdown> element itself. Here we listen to events on it and on the document.
  host: {
    '(mouseenter)': 'cancelClose()',
    '(mouseleave)': 'scheduleClose()',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'close()',
  },
})
export class Dropdown {
  readonly label = input.required<string>();
  readonly align = input<'start' | 'end'>('start'); // which side the panel opens from

  protected readonly isOpen = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private closeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // If the component is destroyed, cancel the timer.
    inject(DestroyRef).onDestroy(() => this.cancelClose());
  }

  toggle() {
    this.cancelClose();
    this.isOpen.update((open) => !open);
  }

  close() {
    this.cancelClose();
    this.isOpen.set(false);
  }

  protected scheduleClose() {
    if (!this.isOpen()) return;
    this.cancelClose();
    this.closeTimer = setTimeout(() => this.isOpen.set(false), CLOSE_DELAY_MS);
  }

  protected cancelClose() {
    clearTimeout(this.closeTimer);
  }

  // Click anywhere outside the dropdown -> close.
  protected onDocumentClick(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }
}
