import { useRef, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { captionFrom } from './post-text';

function toSize(v: unknown): string | undefined {
  if (v == null || v === '') return undefined;
  const s = String(v);
  return /^\d+$/.test(s) ? `${s}px` : s;
}

export function Figure({
  src,
  alt,
  width,
  caption,
  className,
  plate = true,
}: {
  src: string;
  alt?: string;
  width?: string | number;
  caption?: string | null;
  className?: string;
  plate?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [zoomWidth, setZoomWidth] = useState<number | undefined>();
  const text = caption === undefined ? captionFrom(alt) : caption;
  const open = () => {
    const d = dialogRef.current;
    const img = imgRef.current;
    if (img && img.naturalWidth) {
      const pad = plate ? 48 : 0;
      const scale = Math.min((window.innerWidth * 0.92 - pad) / img.naturalWidth, (window.innerHeight - 160 - pad) / img.naturalHeight, 2.5);
      setZoomWidth(Math.max(1, Math.round(img.naturalWidth * Math.max(scale, 1))) + pad);
    }
    if (d && !d.open) d.showModal();
  };
  const close = () => dialogRef.current?.close();
  if (failed) return null;
  const style: CSSProperties | undefined = width ? { width: toSize(width) } : undefined;
  return (
    <figure className={cn('post-figure', className)}>
      <button type="button" className={cn('post-figure-frame', plate && 'has-plate')} onClick={open} aria-label={text ? `Enlarge figure: ${text}` : 'Enlarge figure'}>
        <img ref={imgRef} src={src} alt={alt ?? ''} loading="lazy" decoding="async" style={style} onError={() => setFailed(true)} />
      </button>
      {text && <figcaption>{text}</figcaption>}
      <dialog
        ref={dialogRef}
        className="post-lightbox"
        aria-label={text ?? alt ?? 'Figure'}
        onClick={e => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') close();
        }}
      >
        <img src={src} alt={alt ?? ''} className={cn(plate && 'has-plate')} style={zoomWidth ? { width: zoomWidth } : undefined} />
        {text && <p className="post-lightbox-caption">{text}</p>}
        <button type="button" className="post-lightbox-close" onClick={close} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </dialog>
    </figure>
  );
}
