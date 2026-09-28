import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { HeroSection } from '@/components/sections/HeroSection';
import { TimelineSection } from '@/components/sections/TimelineSection';
import { WritingSection } from '@/components/sections/WritingSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { FlightCanvas } from '@/components/flight/FlightCanvas';
import { YearRail } from '@/components/site/YearRail';

export function HomePage() {
  return (
    <PortfolioLayout>
      <FlightCanvas />
      <HeroSection />
      <TimelineSection />
      <WritingSection />
      <ContactSection />
      <YearRail />
    </PortfolioLayout>
  );
}
