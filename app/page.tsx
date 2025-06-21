"use client"

import { useEffect, useState } from "react"
import { StarsBackground } from "@/components/stars"
import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/hero-section"
import Preloader from "@/components/preloader"
import ServicesComponent from "@/components/services-component"
import Footer from "@/components/footer"
import FeaturesSectionDemo from "@/components/about-our-technology"
import FaqSection from "@/components/faq-section"
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { HeroGeometric } from "@/components/ui/shape-landing-hero"
import { MarqueeDemo } from "@/components/MarqueeDemo"
export default function Page() {
  const navItems = [
      {
        name: "Home",
        link: "#features",
      },
      {
        name: "Services",
        link: "#pricing",
      },
      {
        name: "Technology",
        link: "#contact",
      },
      {
        name: "FAQ",
        link: "#contact",
      },
    ];
   const handlePreloaderComplete = () => {
    setShowPreloader(false);
  };
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showPreloader, setShowPreloader] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

   useEffect(() => {
    // Show preloader for 1.5 seconds, then hide it
    const timer = setTimeout(() => {
      handlePreloaderComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showPreloader) {
    return <Preloader />
  }


  return (
    <div className="min-h-screen w-full bg-[#0D001D]">
      <div className="flex flex-col min-h-screen">
        <div className="relative w-full">
              <Navbar>
                {/* Desktop Navigation */}
                <NavBody>
                  <NavbarLogo />
                  <NavItems items={navItems} />
                  <div className="flex items-center gap-4">
                    
                    <NavbarButton variant="primary">Connect Wallet</NavbarButton>
                  </div>
                </NavBody>
        
                {/* Mobile Navigation */}
                <MobileNav>
                  <MobileNavHeader>
                    <NavbarLogo />
                    <MobileNavToggle
                      isOpen={isMobileMenuOpen}
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    />
                  </MobileNavHeader>
        
                  <MobileNavMenu
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                  >
                    {navItems.map((item, idx) => (
                      <a
                        key={mobile-link-${idx}}
                        href={item.link}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="relative text-neutral-600 dark:text-neutral-300"
                      >
                        <span className="block">{item.name}</span>
                      </a>
                    ))}
                    <div className="flex w-full flex-col gap-4">
                      <NavbarButton
                        onClick={() => setIsMobileMenuOpen(false)}
                        variant="primary"
                        className="w-full"
                      >
                        Login
                      </NavbarButton>
                      <NavbarButton
                        onClick={() => setIsMobileMenuOpen(false)}
                        variant="primary"
                        className="w-full"
                      >
                        Book a call
                      </NavbarButton>
                    </div>
                  </MobileNavMenu>
                </MobileNav>
              </Navbar>
              
        
              {/* Hero*/}
          <section id="hero" className="w-full min-h-screen">
             <HeroGeometric badge="ZKP"
            title1 = "Zero Knowledge Proof"
            title2 = "Flash Loan Application" />
            </section>  
       {/* Services*/}
        <section id="services" className="w-full h-fit py-7">
          <ServicesComponent />
        </section>
        {/* Tech Stack */}
        <section id="technology" className="w-full h-fit py-7">
          <h1 className="text-4xl md:text-5xl font-bold text-center text-white mb-8">
            About Our Technology
          </h1>
          <MarqueeDemo/>
        </section>
        {/* FAQ */}
        <section id="technology" className="w-full min-h-screen">
        <FaqSection />
        </section>
        <Footer/>
      </div>
      </div>

    
  )
}