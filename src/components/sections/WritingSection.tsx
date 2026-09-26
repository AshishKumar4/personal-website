import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Container, SectionHeader } from '@/components/site/SectionHeader';
import { PostRow } from '@/components/site/PostRow';

export function WritingSection() {
  const { data, loading } = useSiteConfig();
  const posts = (data?.posts ?? []).slice(0, 4);

  if (!loading && posts.length === 0) return null;

  return (
    <section id="writing" className="relative pb-32 md:pb-48" aria-label="Writing">
      <Container>
        <SectionHeader
          label="Writing"
          title="Notes on systems and learning machines."
          aside={
            <Link to="/blog" className="group inline-flex items-center gap-1.5 text-foreground/60 transition-colors hover:text-foreground">
              All posts <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          }
        />
        <ol className="mt-14 border-b border-white/10 md:mt-20">
          {posts.map((post, i) => <PostRow key={post.slug} post={post} index={i + 1} />)}
        </ol>
      </Container>
    </section>
  );
}
