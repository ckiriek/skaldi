'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Settings,
  User,
  LogOut,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = React.useState<{ name: string; initials: string; avatar?: string }>({ 
    name: 'User', 
    initials: 'U' 
  })

  React.useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('first_name, last_name, avatar_url')
          .eq('id', authUser.id)
          .single()
        
        const firstName = profile?.first_name || ''
        const lastName = profile?.last_name || ''
        const name = [firstName, lastName].filter(Boolean).join(' ') || authUser.email?.split('@')[0] || 'User'
        const initials = firstName && lastName 
          ? `${firstName[0]}${lastName[0]}`.toUpperCase()
          : name.slice(0, 2).toUpperCase()
        
        setUser({ name, initials, avatar: profile?.avatar_url })
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-12 items-center border-b bg-background/95 backdrop-blur-sm px-4 shadow-sm">
        <div className="flex flex-1 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center">
            <Image 
              src="/Skaldi_logo.png" 
              alt="Skaldi" 
              width={28} 
              height={28}
              className="object-contain h-7 w-7"
              priority
            />
            <span className="ml-2 text-sm font-semibold tracking-tight text-foreground">Skaldi</span>
          </Link>

          {/* Right Side: Navigation & User */}
          <div className="flex items-center gap-4">
            {/* Navigation Links */}
            <nav className="flex items-center gap-3">
              {navigation.map((item) => {
                const isActive = item.href === '/dashboard' 
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-medium transition-colors px-2 py-1 rounded-md',
                      isActive
                        ? 'text-primary bg-primary/5'
                        : 'text-muted-foreground hover:text-primary hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            <div className="h-6 w-px bg-border" />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full hover:bg-muted/50 transition-colors pl-2 pr-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-medium leading-none">{user.name}</p>
                  </div>
                  <Avatar className="h-7 w-7">
                    {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{user.initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6 max-w-[1600px] mx-auto">
        {children}
      </main>
    </div>
  )
}
