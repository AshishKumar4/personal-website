import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { SocialSidebar } from './SocialSidebar';
import { api } from '@/lib/api-client';
import { SiteConfig } from '@shared/types';
import { AnimatedGridBackground } from '@/components/ui/AnimatedGridBackground';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { AuroraBackgroundWrapper } from '@/components/ui/AuroraBackground';
import { VortexBackground } from '@/components/ui/VortexBackground';
import { MatrixBackground } from '@/components/ui/MatrixBackground';
type PortfolioLayoutProps = {
  children: React.ReactNode;
};
export function PortfolioLayout({ children }: PortfolioLayoutProps) {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api<SiteConfig>('/api/config');
        setConfig(data);
      } catch (error) {
        console.error("Failed to fetch site config for layout:", error);
      }
    };
    fetchConfig();
  }, []);
  const renderBackground = () => {
    if (!config) {
      // Default to grid while loading
      return <AnimatedGridBackground />;
    }
    switch (config.backgroundEffect) {
      case 'particles':
        return <ParticleBackground />;
      case 'aurora':
        return <AuroraBackgroundWrapper />;
      case 'vortex':
        return <VortexBackground />;
      case 'matrix':
        return <MatrixBackground />;
      case 'grid':
      default:
        return <AnimatedGridBackground />;
    }
  };
  return (
    <div className="flex flex-col min-h-screen">
      {renderBackground()}
      <Header />
      <SocialSidebar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}