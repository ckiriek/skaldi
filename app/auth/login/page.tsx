'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Mail, Lock, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-2xl shadow-sm border">
        <CardHeader className="text-center space-y-0.5 pb-3 pt-4">
          <div className="mx-auto mb-1.5 flex items-center justify-center gap-2">
            <Image src="/Skaldi_logo.png" alt="Skaldi" width={40} height={40} priority />
            <CardTitle className="text-xl font-semibold tracking-tight">Skaldi</CardTitle>
          </div>
          <CardDescription className="text-xs leading-snug">Your Clinical Trial Documents</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <form onSubmit={handleLogin} className="space-y-3">
            {error && (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label htmlFor="email" className="text-[11px] leading-none">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@democro.com"
                inputSize="sm"
                leftIcon={<Mail className="h-3.5 w-3.5" />}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-[11px] leading-none">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                inputSize="sm"
                leftIcon={<Lock className="h-3.5 w-3.5" />}
                required
              />
            </div>

            <Button type="submit" className="w-full" size="sm" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
