import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterAll, beforeEach, describe, expect, test } from 'bun:test';

GlobalRegistrator.register({
  url: 'https://ashishkumarsingh.com/',
  settings: {
    fetch: {
      interceptor: {
        beforeAsyncRequest: async ({ window }) => new window.Response('{"success":false,"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } }),
      },
    },
  },
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterAll(() => {
  Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  return GlobalRegistrator.unregister();
});

const { StrictMode, act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Route, Routes } = await import('react-router-dom');
const { ThemeProvider } = await import('@/contexts/ThemeContext');
const { PortfolioLayout } = await import('@/components/layout/PortfolioLayout');
const { AdminLayout } = await import('@/components/layout/AdminLayout');
const { MailLayout } = await import('@/components/mail/MailLayout');

const indexHtml = await Bun.file(new URL('../../../index.html', import.meta.url)).text();
const prePaintSource = new DOMParser().parseFromString(indexHtml, 'text/html').querySelector('head script:not([src])')?.textContent;
if (!prePaintSource) throw new Error('index.html has no inline pre-paint script');

type ThemeStorage = Pick<Storage, 'getItem'>;

const stored = (theme: string | null): ThemeStorage => ({ getItem: key => (key === 'theme' ? theme : null) });
const blocked: ThemeStorage = {
  getItem: () => {
    throw new DOMException('Storage is disabled', 'SecurityError');
  },
};

function prePaintIsInk(pathname: string, storage: ThemeStorage) {
  const doc = document.implementation.createHTMLDocument('');
  doc.documentElement.className = 'dark';
  new Function('document', 'location', 'localStorage', prePaintSource)(doc, { pathname }, storage);
  return doc.documentElement.classList.contains('dark');
}

describe('pre-paint theme script in index.html', () => {
  test.each(['/', '/about', '/blog', '/blog/a-post', '/admin/login', '/mailbox'])('keeps %s in ink with a paper preference', path => {
    expect(prePaintIsInk(path, stored('light'))).toBe(true);
  });

  test.each(['/admin', '/admin/posts', '/mail', '/mail/inbox'])('applies a paper preference on %s', path => {
    expect(prePaintIsInk(path, stored('light'))).toBe(false);
  });

  test.each([null, 'dark'])('keeps the admin in ink when the stored preference is %p', theme => {
    expect(prePaintIsInk('/admin', stored(theme))).toBe(true);
  });

  test('keeps the admin in ink when storage is blocked', () => {
    expect(prePaintIsInk('/admin', blocked)).toBe(true);
  });
});

describe('document theme per layout', () => {
  const isInk = () => document.documentElement.classList.contains('dark');
  const themeColor = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content');

  function onPage(path: string, check: () => void) {
    const container = document.body.appendChild(document.createElement('div'));
    const root = createRoot(container);
    act(() =>
      root.render(
        <StrictMode>
          <ThemeProvider>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route path="/" element={<PortfolioLayout><p>home</p></PortfolioLayout>} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<p>dashboard</p>} />
                </Route>
                <Route path="/mail" element={<MailLayout />}>
                  <Route index element={<p>inbox</p>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </ThemeProvider>
        </StrictMode>,
      ),
    );
    try {
      check();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  }

  function click(selector: string, text: string) {
    const target = [...document.querySelectorAll(selector)].find(el => el.textContent?.trim() === text);
    if (!(target instanceof HTMLElement)) throw new Error(`No ${selector} labelled "${text}"`);
    act(() => target.click());
  }

  beforeEach(() => {
    document.documentElement.className = 'dark';
    document.head.innerHTML = '<meta name="theme-color" content="#07080c">';
    localStorage.clear();
  });

  test('public pages stay in ink when the stored preference is paper', () => {
    localStorage.setItem('theme', 'light');
    onPage('/', () => {
      expect(isInk()).toBe(true);
      expect(themeColor()).toBe('#07080c');
    });
  });

  test('the admin follows the stored preference and its toggle, and leaving it restores ink', () => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('authToken', 'token');
    onPage('/admin', () => {
      expect(isInk()).toBe(false);
      expect(themeColor()).toBe('#f0ede6');

      click('aside button', 'Ink mode');
      expect(isInk()).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');

      click('aside button', 'Paper mode');
      expect(isInk()).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');

      click('aside a', 'Ashish.');
      expect(document.body.textContent).toContain('home');
      expect(isInk()).toBe(true);
      expect(themeColor()).toBe('#07080c');
    });
  });

  test('mail follows the stored preference', () => {
    localStorage.setItem('theme', 'light');
    onPage('/mail', () => {
      expect(isInk()).toBe(false);
      expect(themeColor()).toBe('#f0ede6');
    });
  });

  test('admin and mail default to ink without a stored preference', () => {
    localStorage.setItem('authToken', 'token');
    onPage('/admin', () => expect(isInk()).toBe(true));
    onPage('/mail', () => expect(isInk()).toBe(true));
  });
});
