"use client"

import { useState } from "react"
import { Wallet, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMenuOpen(false)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setIsMenuOpen(false)
  }

  return (
    <>
      <nav className="w-full px-4 sm:px-6 lg:px-8 py-6 relative z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={scrollToTop}>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300 group-hover:scale-105">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">Arkham</span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-20">
            <button
              onClick={scrollToTop}
              className="text-white text-md font-semibold hover:text-green-400 transition-all duration-300 relative group"
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-400 to-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </button>
            <button
              onClick={() => scrollToSection('services')}
              className="text-gray-400 font-semibold hover:text-white transition-all duration-300 relative group"
            >
              Services
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-400 to-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </button>
            <button
              onClick={() => scrollToSection('technology')}
              className="text-gray-400 font-semibold hover:text-white transition-all duration-300 relative group"
            >
              Technology
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-400 to-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="text-gray-400 font-semibold hover:text-white transition-all duration-300 relative group"
            >
              FAQ
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-400 to-cyan-400 group-hover:w-full transition-all duration-300"></span>
            </button>
          </div>

          {/* Desktop Connect Wallet Button */}

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
                        <Button
                          variant="outline"
                          className="bg-transparent border-2 border-gray-600 text-white hover:from-green-400/10 hover:to-cyan-400/10 hover:border-green-400 transition-all duration-300 rounded-full px-6 py-2.5 font-medium shadow-lg hover:shadow-green-400/25 hover:scale-105"
                          onClick={openConnectModal}
                        >
                          <Wallet className="w-4 h-4 mr-2" />
                          Connect Wallet
                        </Button>
                      );
                    }

                    return (
                      <Button
                        variant="outline"
                        className="bg-gradient-to-r from-green-400 to-cyan-400 text-black font-semibold rounded-full px-6 py-2.5 transition-all duration-300 transform hover:scale-105"
                        onClick={openAccountModal}
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                        {account.displayName}
                      </Button>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>



          {/* Mobile Menu Button */}
          <div className="flex items-center space-x-3 md:hidden">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-2 border-gray-600 text-white hover:bg-gradient-to-r hover:from-green-400/10 hover:to-cyan-400/10 hover:border-green-400 transition-all duration-300 rounded-full px-4 py-2"
            >
              <Wallet className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
              className="text-white hover:bg-gray-800 rounded-full p-2 transition-all duration-300"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={toggleMenu}></div>
          <div className="fixed top-0 right-0 h-full w-80 bg-gradient-to-b from-gray-900 to-black border-l border-gray-800 shadow-2xl">
            <div className="flex flex-col p-6 pt-24 space-y-6">
              <button
                onClick={scrollToTop}
                className="text-white text-xl font-medium hover:text-green-400 transition-all duration-300 py-3 border-b border-gray-800 hover:border-green-400/50 text-left"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('services')}
                className="text-gray-400 text-xl font-medium hover:text-white transition-all duration-300 py-3 border-b border-gray-800 hover:border-green-400/50 text-left"
              >
                Services
              </button>
              <button
                onClick={() => scrollToSection('technology')}
                className="text-gray-400 text-xl font-medium hover:text-white transition-all duration-300 py-3 border-b border-gray-800 hover:border-green-400/50 text-left"
              >
                Technology
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="text-gray-400 text-xl font-medium hover:text-white transition-all duration-300 py-3 border-b border-gray-800 hover:border-green-400/50 text-left"
              >
                FAQ
              </button>
              <div className="pt-6">
                <Button
                  className="w-full bg-gradient-to-r from-green-400 to-cyan-400 hover:from-green-500 hover:to-cyan-500 text-black font-semibold rounded-full py-3 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-400/25"
                  onClick={toggleMenu}
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect Wallet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
