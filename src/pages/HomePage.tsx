import React from 'react';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { HeroSection } from '@/components/sections/HeroSection';
import { AboutSection } from '@/components/sections/AboutSection';
import { ExperienceSection } from '@/components/sections/ExperienceSection';
import { ProjectsSection } from '@/components/sections/ProjectsSection';
import { WritingSection } from '@/components/sections/WritingSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { Toaster } from '@/components/ui/sonner';
export function HomePage() {
  return (
    <PortfolioLayout>
      <div className="relative z-10">
        <HeroSection />
        <AboutSection />
        <ExperienceSection />
        <ProjectsSection />
        <WritingSection />
        <ContactSection />
      </div>
      <Toaster theme="dark" />
    </PortfolioLayout>
  );
}