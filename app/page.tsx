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

export default function Page() {
  const [showPreloader, setShowPreloader] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  const handlePreloaderComplete = () => {
    setFadeOut(true)
    setTimeout(() => {
      setShowPreloader(false)
    }, 700) 
  }

  if (showPreloader) {
    return <Preloader className={fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"} onComplete={handlePreloaderComplete} />
  }

  return (
    <StarsBackground className="min-h-screen w-full">
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <HeroSection />
        <section id="services">
          <ServicesComponent />
        </section>
        <section id="technology">
          <FeaturesSectionDemo/>
        </section>
        <FaqSection />
        <Footer/>
      </div>
    </StarsBackground>
  )
}
