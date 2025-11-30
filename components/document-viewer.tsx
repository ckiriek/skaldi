'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExportDocumentButtons } from '@/components/export-document-buttons'
import { DocumentStatusBanner } from '@/components/integration/DocumentStatusBanner'
import { Edit3, Save, X, AlertTriangle, CheckCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import 'highlight.js/styles/github.css'

interface DocumentViewerProps {
  content: string
  documentType?: string
  documentId?: string
  documentTitle?: string
  onContentChange?: (newContent: string) => void
}

interface TocItem {
  id: string
  text: string
  level: number
}

// Placeholder patterns for highlighting
const PLACEHOLDER_PATTERNS = {
  // Admin placeholders - yellow (e.g., [TO BE PROVIDED], [PLACEHOLDER])
  admin: /\[(?:TO BE PROVIDED|PLACEHOLDER|TBD|TBC|INSERT|ADD|COMPLETE)[^\]]*\]/gi,
  // Clinical/data placeholders - blue (e.g., [DATA_NEEDED], [CITATION_NEEDED])
  clinical: /\[(?:DATA_NEEDED|CITATION_NEEDED|INSUFFICIENT_DATA|STUDY_DATA|CLINICAL_DATA)[^\]]*\]/gi,
  // Sponsor placeholders - green (e.g., [SPONSOR], [COMPANY])
  sponsor: /\[(?:SPONSOR|COMPANY|MANUFACTURER|APPLICANT)[^\]]*\]/gi,
}

// Highlight placeholders in text with colored spans
function highlightPlaceholders(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') return text
  
  // Combine all patterns
  const allPatterns = [
    { pattern: PLACEHOLDER_PATTERNS.admin, className: 'bg-yellow-100 text-yellow-800 px-1 rounded border border-yellow-300' },
    { pattern: PLACEHOLDER_PATTERNS.clinical, className: 'bg-blue-100 text-blue-800 px-1 rounded border border-blue-300' },
    { pattern: PLACEHOLDER_PATTERNS.sponsor, className: 'bg-green-100 text-green-800 px-1 rounded border border-green-300' },
  ]
  
  let result: React.ReactNode[] = [text]
  
  allPatterns.forEach(({ pattern, className }) => {
    const newResult: React.ReactNode[] = []
    result.forEach((part, partIndex) => {
      if (typeof part !== 'string') {
        newResult.push(part)
        return
      }
      
      const segments = part.split(pattern)
      const matches = part.match(pattern) || []
      
      segments.forEach((segment, i) => {
        if (segment) newResult.push(segment)
        if (matches[i]) {
          newResult.push(
            <span key={`${partIndex}-${i}`} className={className}>
              {matches[i]}
            </span>
          )
        }
      })
    })
    result = newResult
  })
  
  return result.length === 1 ? result[0] : result
}

export function DocumentViewer({ content, documentType, documentId, documentTitle, onContentChange }: DocumentViewerProps) {
  const { toast } = useToast()
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeSection, setActiveSection] = useState<string>('')
  const [validationStatus, setValidationStatus] = useState<any>(null)
  const [loadingValidation, setLoadingValidation] = useState(false)
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [needsRevalidation, setNeedsRevalidation] = useState(false)
  
  // Count placeholders
  const placeholderCount = useMemo(() => {
    const currentContent = isEditing ? editedContent : content
    const adminCount = (currentContent.match(PLACEHOLDER_PATTERNS.admin) || []).length
    const clinicalCount = (currentContent.match(PLACEHOLDER_PATTERNS.clinical) || []).length
    const sponsorCount = (currentContent.match(PLACEHOLDER_PATTERNS.sponsor) || []).length
    return { admin: adminCount, clinical: clinicalCount, sponsor: sponsorCount, total: adminCount + clinicalCount + sponsorCount }
  }, [content, editedContent, isEditing])
  
  // Update edited content when content prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(content)
    }
  }, [content, isEditing])
  
  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(editedContent !== content)
  }, [editedContent, content])
  
  // Handle save
  const handleSave = useCallback(async () => {
    if (!documentId) return
    
    setIsSaving(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent })
      })
      
      if (!response.ok) throw new Error('Failed to save')
      
      const data = await response.json()
      
      toast({
        title: 'Document saved',
        description: 'Your changes have been saved. Re-validation recommended.',
      })
      
      setIsEditing(false)
      setHasUnsavedChanges(false)
      setNeedsRevalidation(true)
      
      if (onContentChange) {
        onContentChange(editedContent)
      }
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Could not save your changes. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }, [documentId, editedContent, onContentChange, toast])
  
  // Handle cancel
  const handleCancel = useCallback(() => {
    setEditedContent(content)
    setIsEditing(false)
    setHasUnsavedChanges(false)
  }, [content])

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
      {/* Re-validation Warning Banner */}
      {needsRevalidation && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Document modified</p>
            <p className="text-xs text-amber-700">Re-validation is recommended after editing.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => setNeedsRevalidation(false)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Validation Status Banner */}
      {!loadingValidation && validationStatus && !needsRevalidation && (
        <DocumentStatusBanner
          status={validationStatus.validation_status || 'pending'}
          summary={validationStatus.validation_summary}
          showAutoFix={true}
        />
      )}
      
      {/* Placeholder Summary */}
      {placeholderCount.total > 0 && (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/30 px-4 py-2 text-sm">
          <span className="text-muted-foreground font-medium">Placeholders:</span>
          {placeholderCount.admin > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-400" />
              <span className="text-yellow-700">{placeholderCount.admin} admin</span>
            </span>
          )}
          {placeholderCount.clinical > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-200 border border-blue-400" />
              <span className="text-blue-700">{placeholderCount.clinical} clinical</span>
            </span>
          )}
          {placeholderCount.sponsor > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-200 border border-green-400" />
              <span className="text-green-700">{placeholderCount.sponsor} sponsor</span>
            </span>
          )}
        </div>
      )}

      {/* Layout: TOC sidebar + Main content */}
      <div className="flex gap-6 print:block items-start">
        {/* Table of Contents - Sticky sidebar */}
        {toc.length > 0 && (
          <aside className="hidden lg:block w-64 flex-shrink-0 print:hidden sticky top-4 self-start">
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <h3 className="font-semibold text-sm mb-2 text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded-full" />
                  Contents
                </h3>
                {/* Scrollable TOC */}
                <nav 
                  className="space-y-0.5 overflow-y-auto scrollbar-thin" 
                  style={{ maxHeight: 'calc(100vh - 10rem)' }}
                >
                  {toc.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`
                        block w-full text-left text-xs py-1 px-2 rounded transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70
                        ${item.level === 1 ? 'font-semibold text-foreground' : ''}
                        ${item.level === 2 ? 'pl-3 text-muted-foreground' : ''}
                        ${item.level === 3 ? 'pl-5 text-muted-foreground/80' : ''}
                        ${item.level >= 4 ? 'pl-7 text-muted-foreground/70' : ''}
                        ${
                          activeSection === item.id
                            ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                            : 'hover:bg-muted/50 hover:text-foreground'
                        }
                      `}
                    >
                      <span className="line-clamp-1">{item.text}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-8 print:p-0">
            <div className="flex items-center justify-between mb-4 print:hidden">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {documentType ? `${documentType} ${isEditing ? 'editing' : 'preview'}` : 'Document preview'}
                </p>
                {isEditing && hasUnsavedChanges && (
                  <span className="text-xs text-amber-600 font-medium">• Unsaved changes</span>
                )}
              </div>
              <div className="flex gap-2">
                {/* Edit/Save/Cancel buttons */}
                {documentId && !isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || !hasUnsavedChanges}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                )}
                {/* Export buttons - only show when not editing */}
                {!isEditing && documentId && documentTitle && (
                  <ExportDocumentButtons 
                    documentId={documentId} 
                    documentTitle={documentTitle} 
                  />
                )}
              </div>
            </div>
            
            {/* Edit Mode - Textarea */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full min-h-[600px] p-4 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y bg-muted/30"
                  placeholder="Enter document content in Markdown format..."
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Use Markdown formatting. Placeholders like [DATA_NEEDED] will be highlighted.
                </p>
              </div>
            ) : (
            /* View Mode - Rendered Markdown with placeholder highlighting */
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
                  li: ({ node, children, ...props }) => {
                    const processedChildren = Array.isArray(children) 
                      ? children.map((child, i) => 
                          typeof child === 'string' ? highlightPlaceholders(child) : child
                        )
                      : typeof children === 'string' 
                        ? highlightPlaceholders(children) 
                        : children
                    return (
                      <li className="ml-4" {...props}>
                        {processedChildren}
                      </li>
                    )
                  },
                  // Style links
                  a: ({ node, ...props }) => (
                    <a className="text-primary hover:text-primary/80 underline" {...props} />
                  ),
                  // Style paragraphs with placeholder highlighting
                  p: ({ node, children, ...props }) => {
                    // Process children to highlight placeholders
                    const processedChildren = Array.isArray(children) 
                      ? children.map((child, i) => 
                          typeof child === 'string' ? highlightPlaceholders(child) : child
                        )
                      : typeof children === 'string' 
                        ? highlightPlaceholders(children) 
                        : children
                    return (
                      <p className="my-4 text-muted-foreground leading-relaxed" {...props}>
                        {processedChildren}
                      </p>
                    )
                  },
                  // Style horizontal rules
                  hr: ({ node, ...props }) => (
                    <hr className="my-8 border-border" {...props} />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
