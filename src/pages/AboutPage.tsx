import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export function AboutPage() {
  const { config, loading } = useSiteConfig();
  const prefersReducedMotion = useReducedMotion();

  return (
    <PortfolioLayout>
      <main className="relative z-10 py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
          >
            <Link to="/" className="inline-flex items-center text-primary font-mono hover:underline mb-8">
              <ArrowLeft size={16} className="mr-2" />
              Home
            </Link>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground font-display">About Me</h1>
            {loading ? (
              <div className="mt-12 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full mt-8" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : config?.aboutStory ? (
              <div className="mt-12 prose-styles max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {config.aboutStory}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="mt-12 text-muted-foreground">{config?.about}</p>
            )}
          </motion.div>
        </div>
      </main>
      <Toaster theme="dark" />
    </PortfolioLayout>
  );
}
