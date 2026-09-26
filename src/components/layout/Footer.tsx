import { Link } from 'react-router-dom';
import { PERSONAL_INFO, SOCIAL_LINKS } from '@/components/config/constants';

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="fade-free relative z-10">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-4 border-t border-foreground/10 px-5 py-8 text-[0.8125rem] text-foreground/50 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-5">
          <span>© {YEAR} {PERSONAL_INFO.name}</span>
          <span className="text-foreground/35">Terrain rendered live in WebGL2. Built by hand.</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/blog" className="transition-colors hover:text-foreground">Writing</Link>
          <Link to="/about" className="transition-colors hover:text-foreground">About</Link>
          {SOCIAL_LINKS.map(s => (
            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
              {s.name}
            </a>
          ))}
          <a href={`mailto:${PERSONAL_INFO.email}`} className="transition-colors hover:text-foreground">Email</a>
        </div>
      </div>
    </footer>
  );
}
