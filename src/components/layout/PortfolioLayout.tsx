import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { SocialSidebar } from './SocialSidebar';
type PortfolioLayoutProps = {
  children: React.ReactNode;
};
export function PortfolioLayout({ children }: PortfolioLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <SocialSidebar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}