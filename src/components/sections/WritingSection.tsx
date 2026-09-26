import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Container, SectionHeader } from '@/components/site/SectionHeader';
import { PostRow } from '@/components/site/PostRow';
import { useStageRegion } from '@/components/site/stage';

export function WritingSection() {
  const ref = useRef<HTMLElement>(null);
  const { data, loading } = useSiteConfig();
  const posts = (data?.posts ?? []).slice(0, 4);
  useStageRegion(ref, { kind: 'section', label: 'Field notes' });

  const empty = !loading && posts.length === 0;

  return (
    <section ref={ref} id="writing" data-scene="night" aria-label="Field notes" className={empty ? 'hidden' : 'relative pb-32 md:pb-44'}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background/40" />
      <Container className="relative">
        <SectionHeader
          label="Field notes"
          title="Written down so I would understand it."
          aside={
            <Link to="/blog" className="pill group">
              All writing
              <ArrowUpRight size={13} className="opacity-60 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
            </Link>
          }
        />
        <ol className="mt-14 border-b border-foreground/10 md:mt-20">
          {posts.map((post, i) => <PostRow key={post.slug} post={post} index={i + 1} />)}
        </ol>
      </Container>
    </section>
  );
}
