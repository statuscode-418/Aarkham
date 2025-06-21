"use client"

import { useEffect, useState } from "react"
import { Zap, Shield } from "lucide-react"

export default function Preloader({ className = "", onComplete }: { className?: string; onComplete?: () => void }) {
  const [progress, setProgress] = useState(0)
  const [loadingText, setLoadingText] = useState("Loading")

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + Math.random() * 5 + 5, 100)
        if (next >= 100) {
          clearInterval(progressInterval)
          setTimeout(() => {
            onComplete?.() // ✅ Notify parent when done
          }, 200) // Optional delay before transition
        }
        return next
      })
    }, 50)

    const textInterval = setInterval(() => {
      setLoadingText((prev) =>
        prev === "Loading" ? "Loading." :
        prev === "Loading." ? "Loading.." :
        prev === "Loading.." ? "Loading..." : "Loading"
      )
    }, 300)

    return () => {
      clearInterval(progressInterval)
      clearInterval(textInterval)
    }
  }, [onComplete])

  return (
    <div className={`fixed inset-0 bg-black flex items-center justify-center transition-opacity duration-700 ${className}`}>
      <div className="text-center space-y-8">
        <div className="space-y-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 via-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-8 h-8 text-white" />
            <Shield className="w-6 h-6 text-white/80 ml-1" />
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-lg">
            Arkham
          </h1>
        </div>
        <div className="space-y-4">
          <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-gray-400 text-sm font-mono w-20 mx-auto">{loadingText}</div>
        </div>
        <div className="text-gray-500 text-xs font-mono">Built by Status Code 418</div>
      </div>
    </div>
  )
}
