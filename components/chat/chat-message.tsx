"use client"
import { Bot, User } from "lucide-react"
import { ChatMessage } from "@/types/chat"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessageProps {
  message: ChatMessage
}

export const ChatMessageComponent = ({ message }: ChatMessageProps) => {
  return (
    <div
      className={`p-2 rounded-lg w-fit max-w-xs shadow-md flex items-start gap-2 ${
        message.from === "ai" 
          ? "bg-purple-800/80 mr-auto" 
          : "bg-gradient-to-r from-pink-500 to-purple-600 ml-auto flex-row-reverse"
      }`}
    >
      {message.from === "ai" ? (
        <Bot className="w-4 h-4 text-purple-300 mt-0.5 flex-shrink-0" />
      ) : (
        <User className="w-4 h-4 text-white mt-0.5 flex-shrink-0" />
      )}
      <div className="text-sm">
        <div className="prose prose-invert prose-sm max-w-none [&>*]:text-white">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
            // Inline code
            code: ({ node, inline, className, children, ...props }: any) => {
              return inline ? (
                <code 
                  className="bg-gray-800 px-1.5 py-0.5 rounded text-xs text-purple-200 border border-gray-600" 
                  {...props}
                >
                  {children}
                </code>
              ) : (
                <code className="text-purple-200 text-xs" {...props}>
                  {children}
                </code>
              )
            },
            
            // Block code
            pre: ({ children }) => (
              <pre className="bg-gray-900 p-3 rounded-lg my-2 overflow-x-auto border border-gray-700">
                {children}
              </pre>
            ),
            
            // Links
            a: ({ href, children }) => (
              <a 
                href={href} 
                className="text-purple-300 hover:text-purple-200 underline transition-colors" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            
            // Blockquotes
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-purple-500 pl-4 italic text-purple-200 my-2 bg-purple-900/20 py-2 rounded-r">
                {children}
              </blockquote>
            ),
            
            // Lists
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-white space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-white space-y-1">{children}</ol>,
            
            // Strong/Bold
            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
            
            // Emphasis/Italic
            em: ({ children }) => <em className="italic text-purple-200">{children}</em>,
          }}
        >
          {message.text}
        </ReactMarkdown>
        </div>
        {message.timestamp && (
          <div className="text-xs opacity-70 mt-2">
            {message.timestamp}
          </div>
        )}
      </div>
    </div>
  )
}
