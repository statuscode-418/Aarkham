"use client"

import React from "react"
import { motion } from "framer-motion"

export default function FaqSection() {
  return (
    <section id="faq" className="relative  py-24 md:px-8">
      
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Have Questions?
          </h2>
          <h3 className="text-3xl md:text-4xl font-semibold text-white">
            We've Got Your Answers
          </h3>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
          <FaqItem
            title="What is Arkham"
            description="Arkham is a revolutionary DeFi platform combining zero-knowledge proofs with flash loans, enabling private and secure borrowing without revealing your strategy. Our platform empowers users to execute profitable trades while maintaining complete confidentiality of their transaction logic."
            delay={0.2}
          />
          
          <FaqItem
            title="How do I start using Arkham"
            description="Getting started with Arkham is simple: connect your wallet, select your loan parameters, deploy your private logic through our ZK circuit builder, and execute. Our intuitive interface guides you through each step, with comprehensive documentation and support available to ensure a smooth experience."
            delay={0.3}
          />
          
          <FaqItem
            title="What makes Arkham secure"
            description="Arkham employs multiple layers of security including audited smart contracts, ZK-proof verification, and formal verification of our core protocols. We prioritize security with regular audits by leading blockchain security firms and a comprehensive bug bounty program."
            delay={0.4}
          />
          
          <FaqItem
            title="What are the transaction fees"
            description="Arkham charges minimal fees based on loan size. Our fee structure is transparent with no hidden costs—just a small percentage of the loan amount to maintain the protocol. Large transactions benefit from fee caps, and early users can participate in our rewards program for potential fee rebates."
            delay={0.5}
          />
        </div>
      </div>
    </section>
  )
}

function FaqItem({ title, description, delay }: { title: string; description: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="relative"
    >
      <h4 className="text-xl font-bold text-white mb-3">{title}</h4>
      <p className="text-gray-400 leading-relaxed">
        {description}
      </p>
    </motion.div>
  )
}
