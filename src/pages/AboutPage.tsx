import { Link } from 'react-router-dom';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { ReadingSurface } from '@/components/layout/ReadingSurface';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { MarkdownContent } from '@/components/MarkdownContent';

// useSiteConfig must run inside the provider, which lives in PortfolioLayout,
// so the config-consuming content is its own component rendered as a child.
function AboutContent() {
  const { config, loading } = useSiteConfig();

  return (
    <ReadingSurface>
      <Link to="/" className="inline-flex items-center text-primary font-mono text-sm hover:underline mb-8">
        <ArrowLeft size={16} className="mr-2" />
        Home
      </Link>
      <h1 className="text-4xl sm:text-5xl font-bold text-foreground font-display">About Me</h1>
      {loading ? (
        <div className="mt-10 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full mt-8" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ) : config?.aboutStory ? (
        <MarkdownContent className="mt-10">{config.aboutStory}</MarkdownContent>
      ) : (
        <p className="mt-10 text-muted-foreground">{config?.about}</p>
      )}
    </ReadingSurface>
  );
}

export function AboutPage() {
  return (
    <PortfolioLayout variant="reading">
      <AboutContent />
      <Toaster theme="dark" />
    </PortfolioLayout>
  );
}
