import { DOCUMENT, Service, effect, inject, signal } from '@angular/core';

export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

@Service()
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly root = this.document.documentElement;

  // The initial value was already set by the small script in index.html,
  // so the page doesn't "flash" the wrong theme until Angular loads.
  readonly scheme = signal<ColorScheme>(this.root.dataset['theme'] === 'light' ? 'light' : 'dark');

  constructor() {
    // effect() = code that re-runs automatically whenever a signal it reads changes.
    // Here: whenever scheme changes, we update <html data-theme="..."> and the CSS does the rest.
    effect(() => {
      this.root.dataset['theme'] = this.scheme();
    });

    // If no theme was picked with the toggle, follow the system setting when it changes.
    const media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: light)');
    media?.addEventListener('change', (event) => {
      if (!readSaved()) {
        this.scheme.set(event.matches ? 'light' : 'dark');
      }
    });
  }

  set(scheme: ColorScheme) {
    this.scheme.set(scheme);
    try {
      localStorage.setItem(STORAGE_KEY, scheme); // so it's remembered next time
    } catch {
      // e.g. a private window without localStorage: we just don't remember it
    }
  }
}

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
