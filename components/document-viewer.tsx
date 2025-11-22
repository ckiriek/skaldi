'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExportDocumentButtons } from '@/components/export-document-buttons'
import { DocumentStatusBanner } from '@/components/integration/DocumentStatusBanner'
import 'highlight.js/styles/github.css'

interface DocumentViewerProps {
  content: string
  documentType?: string
  documentId?: string
  documentTitle?: string
}

interface TocItem {
  id: string
  text: string
  level: number
}

export function DocumentViewer({ content, documentType, documentId, documentTitle }: DocumentViewerProps) {
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeSection, setActiveSection] = useState<string>('')
  const [validationStatus, setValidationStatus] = useState<any>(null)
  const [loadingValidation, setLoadingValidation] = useState(false)

  // Load validation status via API
  useEffect(() => {
    if (documentId) {
      setLoadingValidation(true)
      fetch(`/api/validation/status?documentId=${documentId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setValidationStatus(data.status)
          }
        })
        .catch((error) => console.error('Failed to load validation status:', error))
        .finally(() => setLoadingValidation(false))
    }
  }, [documentId])

  // Extract table of contents from markdown
  useEffect(() => {
    const headings: TocItem[] = []
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (match) {
        const level = match[1].length
        const text = match[2].trim()
        // Use same ID format as headings below (without index)
        const id = `heading-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        headings.push({ id, text, level })
      }
    })
    
    setToc(headings)
  }, [content])

  // Scroll spy - highlight active section
  useEffect(() => {
    const handleScroll = () => {
      const headingElements = document.querySelectorAll('[data-heading-id]')
      let currentSection = ''

      headingElements.forEach((element) => {
        const rect = element.getBoundingClientRect()
        if (rect.top <= 100 && rect.bottom >= 0) {
          currentSection = element.getAttribute('data-heading-id') || ''
        }
      })

      setActiveSection(currentSection)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check

    return () => window.removeEventListener('scroll', handleScroll)
  }, [toc])

  const scrollToSection = (id: string) => {
    const element = document.querySelector(`[data-heading-id="${id}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Validation Status Banner */}
      {!loadingValidation && validationStatus && (
        <DocumentStatusBanner
          status={validationStatus.validation_status || 'pending'}
          summary={validationStatus.validation_summary}
          showAutoFix={true}
        />
      )}

      <div className="flex gap-6 print:block">
      {/* Table of Contents - Sidebar */}
      {toc.length > 0 && (
        <aside className="hidden lg:block w-64 flex-shrink-0 print:hidden">
          <div className="sticky top-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3 text-foreground">
                  Table of Contents
                </h3>
                <nav className="space-y-1">
                  {toc.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`
                        block w-full text-left text-sm py-1.5 px-2 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                        ${item.level === 1 ? 'font-semibold' : ''}
                        ${item.level === 2 ? 'pl-4' : ''}
                        ${item.level === 3 ? 'pl-6 text-xs' : ''}
                        ${item.level >= 4 ? 'pl-8 text-xs' : ''}
                        ${
                          activeSection === item.id
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }
                      `}
                    >
                      {item.text}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-8 print:p-0">
            <div className="flex items-center justify-between mb-4 print:hidden">
              <p className="text-sm text-muted-foreground">
                {documentType ? `${documentType} preview` : 'Document preview'}
              </p>
              <div className="flex gap-2">
                {documentId && documentTitle && (
                  <ExportDocumentButtons 
                    documentId={documentId} 
                    documentTitle={documentTitle} 
                  />
                )}
              </div>
            </div>
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
                components={{
                  // Add data-heading-id to all headings for scroll spy
                  h1: ({ node, children, ...props }) => {
                    const text = Array.isArray(children) ? children.join('') : String(children || '')
                    const id = `heading-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                    return (
                      <h1 
                        data-heading-id={id} 
                        className="text-3xl font-bold mt-8 mb-4 text-foreground border-b border-border pb-2"
                        {...props}
                      >
                        {children}
                      </h1>
                    )
                  },
                  h2: ({ node, children, ...props }) => {
                    const text = Array.isArray(children) ? children.join('') : String(children || '')
                    const id = `heading-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                    return (
                      <h2 
                        data-heading-id={id} 
                        className="text-2xl font-semibold mt-6 mb-3 text-foreground"
                        {...props}
                      >
                        {children}
                      </h2>
                    )
                  },
                  h3: ({ node, children, ...props }) => {
                    const text = Array.isArray(children) ? children.join('') : String(children || '')
                    const id = `heading-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                    return (
                      <h3 
                        data-heading-id={id} 
                        className="text-xl font-semibold mt-5 mb-2 text-foreground"
                        {...props}
                      >
                        {children}
                      </h3>
                    )
                  },
                  h4: ({ node, children, ...props }) => {
                    const text = Array.isArray(children) ? children.join('') : String(children || '')
                    const id = `heading-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                    return (
                      <h4 
                        data-heading-id={id} 
                        className="text-lg font-semibold mt-4 mb-2 text-foreground"
                        {...props}
                      >
                        {children}
                      </h4>
                    )
                  },
                  // Style tables
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-6">
                      <table className="min-w-full divide-y divide-border border" {...props} />
                    </div>
                  ),
                  thead: ({ node, ...props }) => (
                    <thead className="bg-muted" {...props} />
                  ),
                  th: ({ node, ...props }) => (
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="px-4 py-3 text-sm text-foreground border-b border-border" {...props} />
                  ),
                  // Style code blocks
                  code: ({ node, inline, className, children, ...props }: any) => {
                    if (inline) {
                      return (
                        <code className="bg-muted text-destructive px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                          {children}
                        </code>
                      )
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                  // Style blockquotes
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary/5 text-muted-foreground italic" {...props} />
                  ),
                  // Style lists
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside my-4 space-y-2 text-muted-foreground" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside my-4 space-y-2 text-muted-foreground" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="ml-4" {...props} />
                  ),
                  // Style links
                  a: ({ node, ...props }) => (
                    <a className="text-primary hover:text-primary/80 underline" {...props} />
                  ),
                  // Style paragraphs
                  p: ({ node, ...props }) => (
                    <p className="my-4 text-muted-foreground leading-relaxed" {...props} />
                  ),
                  // Style horizontal rules
                  hr: ({ node, ...props }) => (
                    <hr className="my-8 border-border" {...props} />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
