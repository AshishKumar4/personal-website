import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container, SectionHeader } from '@/components/site/SectionHeader';
import { PostRow } from '@/components/site/PostRow';

export function WritingSection() {
  const { data, loading } = useSiteConfig();
  const posts = (data?.posts ?? []).slice(0, 4);

  if (!loading && posts.length === 0) return null;

  return (
    <section id="writing" className="relative z-10 bg-background pb-28 pt-12 md:pb-40" aria-label="Writing">
      <Container>
        <SectionHeader index={4} kicker="Writing" title="Notes" note="Long-form, occasionally with equations. Notebooks run in Colab." />
        <ol className="mt-16 border-t border-line/20 md:mt-24">
          {loading && posts.length === 0
            ? [...Array(3)].map((_, i) => (
                <li key={i} className="grid gap-4 border-b border-line/10 py-8 md:grid-cols-12">
                  <Skeleton className="h-4 w-24 md:col-span-3" />
                  <Skeleton className="h-10 w-3/4 md:col-span-7" />
                </li>
              ))
            : posts.map((post, i) => <PostRow key={post.slug} post={post} index={i + 1} />)}
        </ol>
        <div className="mt-10 flex justify-end">
          <Link to="/blog" className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground hover:text-signal">
            All writing <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
