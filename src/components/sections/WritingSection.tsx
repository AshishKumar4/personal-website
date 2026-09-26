import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { PostRow } from '@/components/site/PostRow';
import { Scene } from '@/components/site/Scene';

export function WritingSection() {
  const { data, loading } = useSiteConfig();
  const posts = (data?.posts ?? []).slice(0, 4);

  if (!loading && posts.length === 0) return null;

  return (
    <Scene
      id="writing"
      label="Writing"
      scene="noise"
      aside={
        <Link to="/blog" className="pill group">
          All posts
          <ArrowUpRight size={13} className="opacity-60 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
        </Link>
      }
    >
      <ol className="border-b border-foreground/10">
        {posts.map((post, i) => <PostRow key={post.slug} post={post} index={i + 1} />)}
      </ol>
    </Scene>
  );
}
