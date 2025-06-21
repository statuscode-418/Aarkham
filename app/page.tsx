"use client"

import { useEffect, useState } from "react"
import { useRedirectIfAuthenticated } from "@/hooks/use-auth"
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
import { ConnectButton } from "@rainbow-me/rainbowkit"
export default function Page() {
  const { isAuthenticated, isLoading } = useRedirectIfAuthenticated()
  
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

  // If connected, show loading or redirect message
  if (isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#0D001D] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    )
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
                    
                  <ConnectButton.Custom>
  {({
    account,
    chain,
    openChainModal,
    openConnectModal,
    openAccountModal,
    mounted,
  }) => {
    const ready = mounted;
    const connected = ready && account && chain;

    return (
      <div
        {...(!ready && {
          'aria-hidden': true,
          style: {
            opacity: 0,
            pointerEvents: 'none',
            userSelect: 'none',
          },
        })}
      >
        {(() => {
          if (!connected) {
            return (
              <NavbarButton
                variant="primary"
                onClick={openConnectModal}
              >
                Connect Wallet
              </NavbarButton>
            );
          }

          return (
            <NavbarButton
              variant="primary"
              onClick={openAccountModal}
            >
              {account.displayName}
            </NavbarButton>
          );
        })()}
      </div>
    );
  }}
</ConnectButton.Custom>

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
                        key={`mobile-link-${idx}`}
                        href={item.link}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="relative text-neutral-600 dark:text-neutral-300"
                      >
                        <span className="block">{item.name}</span>
                      </a>
                    ))}
                    <div className="flex w-full flex-col gap-4">
                      <ConnectButton.Custom>
                        {({
                          account,
                          chain,
                          openChainModal,
                          openConnectModal,
                          openAccountModal,
                          mounted,
                        }) => {
                          const ready = mounted;
                          const connected = ready && account && chain;

                          return (
                            <div
                              {...(!ready && {
                                'aria-hidden': true,
                                style: {
                                  opacity: 0,
                                  pointerEvents: 'none',
                                  userSelect: 'none',
                                },
                              })}
                            >
                              {(() => {
                                if (!connected) {
                                  return (
                                    <NavbarButton
                                      onClick={() => {
                                        openConnectModal();
                                        setIsMobileMenuOpen(false);
                                      }}
                                      variant="primary"
                                      className="w-full"
                                    >
                                      Connect Wallet
                                    </NavbarButton>
                                  );
                                }

                                return (
                                  <NavbarButton
                                    onClick={() => {
                                      openAccountModal();
                                      setIsMobileMenuOpen(false);
                                    }}
                                    variant="primary"
                                    className="w-full"
                                  >
                                    {account.displayName}
                                  </NavbarButton>
                                );
                              })()}
                            </div>
                          );
                        }}
                      </ConnectButton.Custom>
                    </div>
                  </MobileNavMenu>
                </MobileNav>
              </Navbar>
              
        
              {/* Hero*/}
          <section id="hero" className="w-full min-h-screen">
             <HeroGeometric badge="ZKP"
            title1 = "Zero Knowledge Proof"
            title2 = "Flash Loan Application" />
            
            {/* Call to Action for Wallet Connection */}
            <div className="text-center mt-8 px-4">
              <p className="text-gray-300 text-lg mb-6">
                Connect your wallet to access the flash loan dashboard
              </p>
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openChainModal,
                  openConnectModal,
                  openAccountModal,
                  mounted,
                }) => {
                  const ready = mounted;
                  const connected = ready && account && chain;

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        style: {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button
                              onClick={openConnectModal}
                              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300"
                            >
                              Connect Wallet to Get Started
                            </button>
                          );
                        }

                        return (
                          <button
                            onClick={openAccountModal}
                            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300"
                          >
                            Connected: {account.displayName}
                          </button>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
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
    </div>
    
  )
}