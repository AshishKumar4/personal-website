import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, Mail } from 'lucide-react';
import type { PostSummary } from '@shared/types';
import { PERSONAL_INFO, SOCIAL_LINKS } from '@/components/config/constants';
import { cn } from '@/lib/utils';
import { formatDate } from './post-text';

function Neighbour({ post, dir }: { post: PostSummary; dir: 'newer' | 'older' }) {
  const older = dir === 'older';
  return (
    <Link to={`/blog/${post.slug}`} className={cn('end-card group', older && 'md:text-right')}>
      <span className={cn('end-card-kicker', older && 'md:justify-end')}>
        {!older && <ArrowLeft size={13} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-x-0.5" />}
        {older ? 'Older' : 'Newer'}
        {older && <ArrowRight size={13} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5" />}
      </span>
      <span className="end-card-title">{post.title}</span>
      <span className="end-card-meta tabular">
        {formatDate(post.createdAt, 'short')} · {post.readingTime} min read
      </span>
    </Link>
  );
}

export function EndMatter({ newer, older, colabUrl }: { newer?: PostSummary; older?: PostSummary; colabUrl?: string }) {
  return (
    <footer className="end-matter">
      <div className="end-mark" aria-hidden="true">
        <svg width="44" height="10" viewBox="0 0 44 10">
          <path d="M0 9 L9 5 L14 7 L22 1 L30 6 L35 4 L44 9" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </div>

      {colabUrl && (
        <a href={colabUrl} target="_blank" rel="noopener noreferrer" className="end-colab group">
          <span>
            <span className="end-colab-kicker">Run it yourself</span>
            <span className="end-colab-title">Open this notebook in Google Colab</span>
          </span>
          <ArrowUpRight size={18} aria-hidden="true" className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      )}

      <section className="end-author" aria-label="About the author">
        <img
          src={PERSONAL_INFO.profilePicture}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          onError={e => {
            if (!e.currentTarget.src.endsWith(PERSONAL_INFO.portraitFallback)) e.currentTarget.src = PERSONAL_INFO.portraitFallback;
          }}
          className="end-author-img"
        />
        <div className="min-w-0">
          <div className="end-author-kicker">Written by</div>
          <Link to="/about" className="end-author-name">{PERSONAL_INFO.name}</Link>
          <div className="end-author-role">{PERSONAL_INFO.title}</div>
          <ul className="end-author-links">
            <li>
              <a href={`mailto:${PERSONAL_INFO.email}`}>
                <Mail size={14} aria-hidden="true" /> Email
              </a>
            </li>
            {SOCIAL_LINKS.map(s => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  <s.Icon size={14} aria-hidden="true" /> {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {(newer || older) && (
        <nav className="end-nav" aria-label="More posts">
          <div>{newer && <Neighbour post={newer} dir="newer" />}</div>
          <div>{older && <Neighbour post={older} dir="older" />}</div>
        </nav>
      )}

      <div className="end-back">
        <Link to="/blog" className="group inline-flex items-center gap-2">
          <ArrowLeft size={14} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-x-0.5" />
          All posts
        </Link>
      </div>
    </footer>
  );
}
