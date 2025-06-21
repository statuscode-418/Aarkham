"use client"

import { motion } from "framer-motion"
import { Github, Twitter, Linkedin, Mail, ExternalLink } from "lucide-react"

export default function Footer() {
  const footerLinks = {
    product: [
      { name: "Flash Loans", href: "#" },
      { name: "KYC Verification", href: "#" },
      { name: "Loan Repayment", href: "#" },
      { name: "Documentation", href: "#" },
    ],
    company: [
      { name: "About Us", href: "#" },
      { name: "Technology", href: "#" },
      { name: "FAQ", href: "#" },
      { name: "Contact", href: "#" },
    ],
    resources: [
      { name: "Whitepaper", href: "#" },
      { name: "API Docs", href: "#" },
      { name: "Security", href: "#" },
      { name: "Privacy Policy", href: "#" },
    ],
    community: [
      { name: "Discord", href: "#" },
      { name: "Telegram", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Newsletter", href: "#" },
    ],
  }

  const socialLinks = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Mail, href: "#", label: "Email" },
  ]

  return (
    <footer className="bg-[#010314] border-t border-gray-800 w-full flex justify-center">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
 
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-lg">A</span>
                </div>
                <span className="text-2xl font-bold text-white">Arkham</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm">
                Unlock private DeFi strategies with our zero-knowledge flash loan app—secure instant loans while keeping
                your logic and data fully confidential.
              </p>
              <div className="flex items-center gap-4">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.1 }}
                    className="w-10 h-10 bg-gray-800 hover:bg-cyan-500 rounded-lg flex items-center justify-center transition-colors duration-200 group"
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </motion.a>
                ))}
              </div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link, linkIndex) => (
                  <li key={link.name}>
                    <motion.a
                      href={link.href}
                      whileHover={{ x: 4 }}
                      className="text-gray-400 hover:text-cyan-400 text-sm transition-colors duration-200 flex items-center gap-1 group"
                    >
                      {link.name}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Newsletter Section */}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-white font-semibold text-lg mt-10 mb-2">Stay Updated</h3>
              <p className="text-gray-400 text-sm">Get the latest updates on DeFi innovations and security features.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 min-w-0 md:min-w-96">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 bg-[#44414E] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2 bg-gradient-to-b from-[#baa3e4] via-[#7e61b8] to-[#0D001D] text-white rounded-lg font-medium text-sm hover:from-cyan-600 hover:to-emerald-600 transition-all duration-200 whitespace-nowrap"
              >
                Subscribe
              </motion.button>
            </div>
          </div>
      </div>
    </footer>
  )
}
