import React, { useState, useEffect } from 'react';
import { motion, useScroll } from 'framer-motion';
import { NAV_LINKS, PERSONAL_INFO } from '@/components/config/constants';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link, useLocation } from 'react-router-dom';
const NavLink = ({ href, children, onClick }: { href: string, children: React.ReactNode, onClick?: () => void }) => {
  const location = useLocation();
  const isExternalPage = href.startsWith('/');
  if (isExternalPage) {
    // If we are already on the target page, treat it as an anchor link
    if (href.includes('#') && location.pathname === href.split('#')[0]) {
      return <a href={href} onClick={onClick}>{children}</a>;
    }
    return <Link to={href} onClick={onClick}>{children}</Link>;
  }
  // If on a different page (like /blog), link to home page with anchor
  if (location.pathname !== '/') {
    return <Link to={`/${href}`} onClick={onClick}>{children}</Link>;
  }
  // Smooth scroll on home page
  return <a href={href} onClick={onClick}>{children}</a>;
};
export function Header() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => {
    return scrollY.onChange((latest) => {
      const isScrollingDown = latest > scrollY.getPrevious();
      if (latest > 100 && isScrollingDown) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      setIsScrolled(latest > 50);
    });
  }, [scrollY]);
  const handleMenuToggle = () => setIsMenuOpen(!isMenuOpen);
  const navVariants = {
    visible: { opacity: 1, y: 0 },
    hidden: { opacity: 0, y: -25 },
  };
  const mobileMenuVariants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: "100%" },
  };
  const navLinkClass = "relative text-sm font-mono text-lightest-slate hover:text-green transition-colors duration-300";
  return (
    <motion.header
      variants={navVariants}
      animate={hidden ? 'hidden' : 'visible'}
      transition={{ ease: [0.1, 0.25, 0.3, 1], duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'h-20 bg-dark-navy/80 shadow-md backdrop-blur-sm' : 'h-24'}`}
    >
      <nav className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-green text-2xl font-mono font-bold z-50">AKS</Link>
        {isMobile ? (
          <>
            <Button variant="ghost" size="icon" onClick={handleMenuToggle} className="z-50 text-green">
              {isMenuOpen ? <X /> : <Menu />}
            </Button>
            <motion.div
              initial="closed"
              animate={isMenuOpen ? "open" : "closed"}
              variants={mobileMenuVariants}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-screen w-3/4 bg-light-navy p-8 shadow-xl"
            >
              <div className="flex flex-col items-center justify-center h-full space-y-8">
                {NAV_LINKS.map((link, i) => (
                  <NavLink key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)}>
                    <span className={navLinkClass}>
                      <span className="text-green mr-2">0{i + 1}.</span>{link.name}
                    </span>
                  </NavLink>
                ))}
                <a href={`mailto:${PERSONAL_INFO.email}`} className="font-mono text-sm border border-green text-green rounded-md px-6 py-3 hover:bg-green-tint transition-colors duration-300">
                  Contact
                </a>
              </div>
            </motion.div>
          </>
        ) : (
          <div className="flex items-center space-x-8">
            {NAV_LINKS.map((link, i) => (
              <NavLink key={link.href} href={link.href}>
                 <span className={navLinkClass}>
                    <span className="text-green mr-2">0{i + 1}.</span>{link.name}
                 </span>
              </NavLink>
            ))}
            <a href={`mailto:${PERSONAL_INFO.email}`} className="font-mono text-sm border border-green text-green rounded-md px-4 py-2 hover:bg-green-tint transition-colors duration-300">
              Contact
            </a>
          </div>
        )}
      </nav>
    </motion.header>
  );
}