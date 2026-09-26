import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { HeroSection } from '@/components/sections/HeroSection';
import { AboutSection } from '@/components/sections/AboutSection';
import { ExperienceSection } from '@/components/sections/ExperienceSection';
import { ProjectsSection } from '@/components/sections/ProjectsSection';
import { WritingSection } from '@/components/sections/WritingSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { FlightCanvas } from '@/components/flight/FlightCanvas';

export function HomePage() {
  return (
    <PortfolioLayout>
      <FlightCanvas />
      <HeroSection />
      <AboutSection />
      <ProjectsSection />
      <ExperienceSection />
      <WritingSection />
      <ContactSection />
    </PortfolioLayout>
  );
}
