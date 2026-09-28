const KEY = 'flight-intro';
const SKIP = ['freeze', 'scene', 'motif', 'progress', 'nointro'];
let armed = false;

function eligible(): boolean {
  const { pathname, hash, search } = window.location;
  if (pathname !== '/' || hash || window.scrollY > 40 || performance.now() > 4000) return false;
  const q = new URLSearchParams(search);
  if (SKIP.some(k => q.has(k))) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    if (window.sessionStorage.getItem(KEY)) return false;
    window.sessionStorage.setItem(KEY, '1');
  } catch {
    return true;
  }
  return true;
}

export function releaseIntro() {
  const root = document.documentElement;
  if (root.dataset.intro && root.dataset.intro !== 'go') root.dataset.intro = 'go';
}

export function armIntro() {
  if (armed) return;
  armed = true;
  let ok = false;
  try {
    ok = eligible();
  } catch {
    ok = false;
  }
  if (!ok) return;
  const root = document.documentElement;
  root.dataset.intro = 'hold';
  const early = () => {
    if (root.dataset.intro === 'hold') releaseIntro();
  };
  const events = ['wheel', 'keydown', 'touchstart', 'pointerdown', 'scroll'];
  const off = () => events.forEach(e => window.removeEventListener(e, early));
  events.forEach(e => window.addEventListener(e, early, { passive: true, once: true }));
  window.setTimeout(() => {
    early();
    off();
  }, 2600);
  window.setTimeout(releaseIntro, 8000);
}
