"use client"

import React from "react"
import { motion } from "framer-motion"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
export default function FaqSection() {
  return (
     <section id="faq" className="py-20 px-4 relative">
      
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-300">Everything you need to know about our flash loan platform</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[
              {
                question: "How are loans secured without collateral?",
                answer:
                  "Flash loans are secured by smart contracts that ensure the loan is repaid within the same transaction block. If repayment fails, the entire transaction is reverted, making it impossible to default.",
              },
              {
                question: "What is zk-proof KYC and how does it protect my privacy?",
                answer:
                  "Zero-knowledge proof KYC allows you to prove your identity and creditworthiness without revealing personal information. Our system verifies your credentials while keeping your data completely private and encrypted.",
              },
              {
                question: "How do I repay my flash loan?",
                answer:
                  "Repayment is automated through smart contracts. You must repay the loan plus a small fee within the same transaction block. Our platform provides tools and interfaces to help you execute complex DeFi strategies seamlessly.",
              },
              {
                question: "Is my data private and secure?",
                answer:
                  "Absolutely. We use advanced cryptographic techniques including zero-knowledge proofs and decentralized storage (IPFS) to ensure your data remains private, secure, and under your control at all times.",
              },
            ].map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-slate-700 rounded-lg px-6 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
              >
                <AccordionTrigger className="text-left text-lg font-medium text-white transition-colors no-underline hover:no-underline focus:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 leading-relaxed pt-2">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
  )
}


