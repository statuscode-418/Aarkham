"use client"

import type React from "react"
import { useEffect, useRef } from "react"

interface StarsBackgroundProps {
  children: React.ReactNode
  className?: string
}

export function StarsBackground({ children, className = "" }: StarsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      )
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const stars: Array<{ x: number; y: number; size: number; opacity: number; speed: number }> = []
    const numStars = 150

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.5 + 0.1,
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      stars.forEach((star) => {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fill()

        star.y += star.speed
        star.opacity = 0.2 + Math.sin(Date.now() * 0.001 + star.x) * 0.3

        if (star.y > canvas.height) {
          star.y = -star.size
          star.x = Math.random() * canvas.width
        }
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return (
    <div className={`relative w-full min-h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 w-full"
        style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)" }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
