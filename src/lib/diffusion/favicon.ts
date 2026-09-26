import { sampler } from './sampler-store';
import { alphaBar } from './schedule';
import { gaussianBuffer, renderNoisy } from './noise';

const SIZE = 32;

export function animateFavicon(): () => void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return () => undefined;
  const original = link.href;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return () => undefined;
  ctx.fillStyle = '#09090a';
  ctx.beginPath();
  ctx.roundRect(0, 0, SIZE, SIZE, 7);
  ctx.fill();
  ctx.fillStyle = '#ede9e2';
  ctx.font = '400 24px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('A', 14, 24);
  ctx.fillStyle = '#ff5a1f';
  ctx.beginPath();
  ctx.arc(25, 22, 2.2, 0, Math.PI * 2);
  ctx.fill();
  const x0 = ctx.getImageData(0, 0, SIZE, SIZE).data.slice();
  const eps = gaussianBuffer(SIZE * SIZE * 3, 7);
  const frame = ctx.createImageData(SIZE, SIZE);
  let lastStep = -1;
  let restored = false;

  const unsubscribe = sampler.subscribe(s => {
    if (s.phase === 'done') {
      if (!restored) {
        link.href = original;
        restored = true;
      }
      return;
    }
    if (s.phase !== 'sampling' || s.step - lastStep < 3) return;
    lastStep = s.step;
    restored = false;
    const a = alphaBar(s.t);
    renderNoisy(frame, x0, eps, Math.sqrt(a), Math.sqrt(1 - a));
    ctx.putImageData(frame, 0, 0);
    link.href = canvas.toDataURL('image/png');
  });

  return () => {
    unsubscribe();
    link.href = original;
  };
}
