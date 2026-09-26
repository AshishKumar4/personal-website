import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { HeroSection } from '@/components/sections/HeroSection';
import { StorySection } from '@/components/sections/StorySection';
import { ExperienceSection } from '@/components/sections/ExperienceSection';
import { ProjectsSection } from '@/components/sections/ProjectsSection';
import { WritingSection } from '@/components/sections/WritingSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { FlightCanvas } from '@/components/flight/FlightCanvas';
import { StoryHud } from '@/components/site/StoryHud';
import { FlightHint, FreeFlightOverlay } from '@/components/site/FlightControls';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { resolveStory } from '@/components/site/story';

function Story() {
  const { config } = useSiteConfig();
  return (
    <>
      <div className="story fade-free">
        <HeroSection />
        <StorySection />
        <ProjectsSection />
        <ExperienceSection />
        <WritingSection />
        <ContactSection />
      </div>
      <StoryHud chapters={resolveStory(config)} />
      <FlightHint />
      <FreeFlightOverlay />
    </>
  );
}

export function HomePage() {
  return (
    <PortfolioLayout>
      <FlightCanvas />
      <Story />
    </PortfolioLayout>
  );
}
