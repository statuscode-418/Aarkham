import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-2 pb-0">
      <div className="text-center max-w-5xl mx-auto mt-30 mb-12">
        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-tight tracking-tight">
          <span className="bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">
            Zero Knowledge Proof
          </span>
          <br />
          <span className="text-white font-semibold drop-shadow-lg">Flash Loan Application</span>
        </h1>

        {/* Description */}
        <p className="text-gray-300 font-semibold text-md sm:text-lg md:text-xl max-w-4xl mx-auto mt-12 mb-24 leading-relaxed font-light tracking-wide">
          Unlock private DeFi strategies with our zero-knowledge flash loan app—secure instant loans while keeping your
          logic and data fully confidential. Borrow, profit, and repay—all in one private transaction!
        </p>

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row gap-4 mt-12 mb-12 justify-center items-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-green-400 to-cyan-400 hover:from-green-500 hover:to-cyan-500 text-white font-semibold px-10 py-4 text-xl rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-green-400/50 group flex items-center justify-center"
          >
            Get Started
          </Button>
        </div>
      </div>
      
    </div>
  )
}
