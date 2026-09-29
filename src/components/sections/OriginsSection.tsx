import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { DEFAULT_SITE_EXTRAS } from '@shared/types';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Container } from '@/components/site/SectionHeader';
import { Words } from '@/components/site/Words';
import { useStageRegion } from '@/components/site/stage';
import { originParagraphs } from '@/components/site/origins';
import { PERSONAL_INFO } from '@/components/config/constants';
import './origins.css';

export function OriginsSection() {
  const head = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLDivElement>(null);
  const { config } = useSiteConfig();
  useStageRegion(head, { kind: 'reveal', anchor: 'top', span: 0.5 });
  useStageRegion(figure, { kind: 'reveal', anchor: 'top', span: 0.8 });
  const portrait = config?.portraitUrl || DEFAULT_SITE_EXTRAS.portraitUrl;
  const paragraphs = originParagraphs(config?.origins);

  return (
    <section id="about" aria-labelledby="about-title" data-scene="night" data-motif="mind" data-seed="0.8219" className="relative py-[18svh] md:py-[24svh]">
      <Container>
        <div className="grid grid-cols-1 items-center gap-y-12 md:grid-cols-12 md:gap-x-10">
          <div ref={head} className="reveal-title scrim md:col-span-7">
            <div className="t-kicker legible flex items-center gap-4 text-foreground/70">
              <span>About me</span>
              <span aria-hidden="true" className="reveal-rule h-px w-14 bg-foreground/35" />
            </div>
            <Words as="h2" id="about-title" text="Where it started" className="t-scene mt-6 text-[clamp(2.6rem,5.6vw,5.5rem)] leading-[0.96] text-foreground" />
            <div className="reveal-sub">
              {paragraphs.map((p, i) => (
                <p key={i} className="t-narration legible mt-6 max-w-[38rem] text-[clamp(1.0625rem,1.25vw,1.2rem)] leading-[1.66] text-foreground/92 text-pretty">{p}</p>
              ))}
              <Link to="/about" className="pill group mt-8">
                The longer story
                <ArrowUpRight size={13} className="opacity-60 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
              </Link>
            </div>
          </div>
          <div ref={figure} className="og-portrait md:col-span-4 md:col-start-9">
            <figure className="og-portrait-frame">
              <img
                src={portrait}
                alt={`Portrait of ${PERSONAL_INFO.name}`}
                decoding="async"
                loading="lazy"
                onError={e => {
                  if (!e.currentTarget.src.endsWith(PERSONAL_INFO.portraitFallback)) e.currentTarget.src = PERSONAL_INFO.portraitFallback;
                }}
              />
              <span className="og-portrait-tint" />
            </figure>
          </div>
        </div>
      </Container>
    </section>
  );
}
