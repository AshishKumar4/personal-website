import { useState, type SyntheticEvent } from 'react';
import type { PostSummary } from '@shared/types';
import { RidgeArt } from '@/components/site/RidgeArt';
import { cn } from '@/lib/utils';
import './post-cover.css';

type Fit = 'plate' | 'fill';

export function PostCover({ post, className, eager = false }: { post: Pick<PostSummary, 'slug' | 'coverImage'>; className?: string; eager?: boolean }) {
  const src = post.coverImage;
  const [failed, setFailed] = useState<string | null>(null);
  const [fit, setFit] = useState<Fit>('plate');
  const [loaded, setLoaded] = useState(false);
  const usable = !!src && failed !== src;
  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
    setFit(ratio > 1.4 && ratio < 1.9 && img.naturalWidth >= 640 ? 'fill' : 'plate');
    setLoaded(true);
  };
  return (
    <div className={cn('post-cover', className)} data-fit={usable ? fit : 'art'} data-loaded={usable ? loaded : true}>
      {usable ? (
        <span className="post-cover-media">
          <img src={src} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={onLoad} onError={() => setFailed(src)} />
        </span>
      ) : (
        <RidgeArt seed={post.slug} className="post-cover-art" />
      )}
      <span className="post-cover-tint" aria-hidden="true" />
    </div>
  );
}
