import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { SocialSidebar } from './SocialSidebar';
import { SiteConfigProvider, useSiteConfig } from '@/contexts/SiteConfigContext';
import { AnimatedGridBackground } from '@/components/ui/AnimatedGridBackground';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { AuroraBackgroundWrapper } from '@/components/ui/AuroraBackground';
import { MatrixBackground } from '@/components/ui/MatrixBackground';
import { NeuralBackground } from '@/components/ui/NeuralBackground';

type PortfolioLayoutProps = {
  children: React.ReactNode;
};

function BackgroundRenderer() {
  const { config } = useSiteConfig();

  if (!config) {
    // Default to grid while loading
    return <AnimatedGridBackground />;
  }

  switch (config.backgroundEffect) {
    case 'particles':
      return <ParticleBackground />;
    case 'aurora':
      return <AuroraBackgroundWrapper />;
    case 'matrix':
      return <MatrixBackground />;
    case 'neural':
      return <NeuralBackground />;
    case 'grid':
    default:
      return <AnimatedGridBackground />;
  }
}

export function PortfolioLayout({ children }: PortfolioLayoutProps) {
  return (
    <SiteConfigProvider>
      <div className="flex flex-col min-h-screen">
        <BackgroundRenderer />
        <Header />
        <SocialSidebar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </div>
    </SiteConfigProvider>
  );
}
