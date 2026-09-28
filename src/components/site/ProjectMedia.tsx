import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Project } from '@shared/types';
import { cn } from '@/lib/utils';
import { useStageRegion } from '@/components/site/stage';
import './project-media.css';

type Size = 'feature' | 'card';

const VIDEO_TYPES: Record<string, string> = { webm: 'video/webm', mp4: 'video/mp4', mov: 'video/quicktime', ogv: 'video/ogg' };

function videoSources(value: string) {
  return value
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(src => ({ src, type: VIDEO_TYPES[src.split('?')[0].split('.').pop()?.toLowerCase() ?? ''] }));
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

function useNear(ref: RefObject<HTMLElement>, margin: string) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}

function MediaImg({ src, hidden }: { src: string; hidden?: boolean }) {
  return <img src={src} alt="" decoding="async" className={cn('pm-media', hidden && 'pm-hidden')} />;
}

function LoopVideo({ sources, poster }: { sources: string; poster?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const near = useNear(video, '400px 0px');
  const [playing, setPlaying] = useState(false);
  const visible = useRef(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const seenIo = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          visible.current = entry.intersectionRatio > 0.1;
          if (visible.current && !document.hidden) el.play().catch(() => undefined);
          else if (!el.paused) el.pause();
        }
      },
      { threshold: [0, 0.1, 0.5] },
    );
    seenIo.observe(el);
    const onVisibility = () => {
      if (document.hidden) el.pause();
      else if (visible.current) el.play().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      seenIo.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!near || !el) return;
    el.load();
    if (visible.current) el.play().catch(() => undefined);
  }, [near]);

  return (
    <>
      {poster && <MediaImg src={poster} hidden={playing} />}
      <video
        ref={video}
        muted
        loop
        playsInline
        disablePictureInPicture
        preload="none"
        onPlaying={() => setPlaying(true)}
        className={cn('pm-media pm-video', !playing && 'pm-hidden')}
      >
        {near && videoSources(sources).map(({ src, type }) => <source key={src} src={src} type={type} />)}
      </video>
    </>
  );
}

export function ProjectMedia({ project, href, size = 'feature', className }: { project: Project; href?: string; size?: Size; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useStageRegion(root, { kind: 'reveal', anchor: 'top', span: size === 'card' ? 0.5 : 0.75 });
  const reduced = useReducedMotion();
  const near = useNear(root, '800px 0px');
  const image = project.imageUrl?.trim();
  const video = project.videoUrl?.trim();
  const empty = !image && !video;
  const Tag = href ? 'a' : 'div';

  return (
    <div ref={root} className={cn('pm', `pm-${size}`, className)} data-empty={empty ? '' : undefined}>
      <Tag
        {...(href ? { href, target: '_blank', rel: 'noopener noreferrer', tabIndex: -1 } : {})}
        aria-hidden="true"
        className="pm-window"
      >
        <span className="pm-frame">
          {!near ? null : video && !reduced ? (
            <LoopVideo sources={video} poster={image} />
          ) : image ? (
            <MediaImg src={image} />
          ) : (
            <span className="pm-plate">
              <span className="pm-plate-name">{project.repo || project.name}</span>
            </span>
          )}
          <span className="pm-tint" />
          <span className="pm-glass" />
        </span>
        {size === 'feature' && (
          <>
            <span className="pm-tick pm-tick-tl" />
            <span className="pm-tick pm-tick-tr" />
            <span className="pm-tick pm-tick-bl" />
            <span className="pm-tick pm-tick-br" />
          </>
        )}
      </Tag>
    </div>
  );
}
