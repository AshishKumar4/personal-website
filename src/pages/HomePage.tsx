import React from 'react';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { AnimatedGridBackground } from '@/components/ui/AnimatedGridBackground';
import { HeroSection } from '@/components/sections/HeroSection';
import { AboutSection } from '@/components/sections/AboutSection';
import { ExperienceSection } from '@/components/sections/ExperienceSection';
import { ProjectsSection } from '@/components/sections/ProjectsSection';
import { Toaster } from '@/components/ui/sonner';
export function HomePage() {
  return (
    <PortfolioLayout>
      <AnimatedGridBackground />
      <div className="relative z-10">
        <HeroSection />
        <AboutSection />
        <ExperienceSection />
        <ProjectsSection />
      </div>
      <Toaster theme="dark" />
    </PortfolioLayout>
  );
}