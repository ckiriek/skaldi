'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowUp, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingNavProps {
  showBack?: boolean
  backHref?: string
  backLabel?: string
}

export function FloatingNav({ showBack = true, backHref, backLabel = 'Back' }: FloatingNavProps) {
  const router = useRouter()
  const [showButtons, setShowButtons] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show buttons after scrolling 200px
      setShowButtons(window.scrollY > 200)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial state
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 flex flex-col gap-2 z-50 transition-all duration-300 print:hidden',
        showButtons ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
      )}
    >
      {/* Scroll to top button */}
      <Button
        variant="outline"
        size="icon"
        onClick={scrollToTop}
        className="h-11 w-11 rounded-full shadow-lg bg-white/95 backdrop-blur-sm border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all duration-200"
        aria-label="Scroll to top"
      >
        <ChevronUp className="h-5 w-5" />
      </Button>

      {/* Back button */}
      {showBack && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleBack}
          className="h-11 w-11 rounded-full shadow-lg bg-white/95 backdrop-blur-sm border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
          aria-label={backLabel}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}

/**
 * Floating navigation with scroll-to-top (bottom-right) and back (top-left) buttons
 * Shows after scrolling 200px down
 */
export function ScrollToTop({ showBack = false, backHref }: { showBack?: boolean; backHref?: string }) {
  const router = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 200)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial state
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <>
      {/* Back button - BOTTOM LEFT with label above */}
      {showBack && (
        <div
          className={cn(
            'fixed bottom-6 left-6 z-50 flex flex-col items-center gap-1 transition-all duration-300 print:hidden',
            show ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0 pointer-events-none'
          )}
        >
          <span className="text-xs text-muted-foreground font-medium">Back</span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            className="h-11 w-11 rounded-full shadow-lg bg-white/95 backdrop-blur-sm border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Scroll to top button - BOTTOM RIGHT with label above */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1 transition-all duration-300 print:hidden',
          show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        )}
      >
        <span className="text-xs text-muted-foreground font-medium">Scroll Up</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="h-11 w-11 rounded-full shadow-lg bg-white/95 backdrop-blur-sm border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all duration-200"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </div>
    </>
  )
}
