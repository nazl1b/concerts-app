import { TestBed } from '@angular/core/testing';
import { Theme } from './theme';

describe('Theme', () => {
  const root = document.documentElement;
  // The listener Theme adds for changes of the system setting (light/dark).
  let systemChange: ((event: { matches: boolean }) => void) | undefined;

  beforeEach(() => {
    localStorage.clear();
    delete root.dataset['theme'];
    systemChange = undefined;
    // jsdom has no matchMedia, so we give it a fake one.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: (_: string, listener: typeof systemChange) => (systemChange = listener),
    });
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    delete root.dataset['theme'];
  });

  it('starts with the theme the script in index.html picked', () => {
    root.dataset['theme'] = 'light';
    expect(TestBed.inject(Theme).scheme()).toBe('light');
  });

  it('is dark by default', () => {
    expect(TestBed.inject(Theme).scheme()).toBe('dark');
  });

  it('applies and remembers the chosen theme', () => {
    const theme = TestBed.inject(Theme);
    theme.set('light');
    TestBed.tick(); // runs the effect
    expect(root.dataset['theme']).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');

    theme.set('dark');
    TestBed.tick();
    expect(root.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('follows the system setting when nothing was chosen', () => {
    const theme = TestBed.inject(Theme);
    systemChange!({ matches: true });
    expect(theme.scheme()).toBe('light');
    systemChange!({ matches: false });
    expect(theme.scheme()).toBe('dark');
  });

  it('ignores the system setting after you choose a theme', () => {
    const theme = TestBed.inject(Theme);
    theme.set('dark');
    systemChange!({ matches: true });
    expect(theme.scheme()).toBe('dark');
  });
});
