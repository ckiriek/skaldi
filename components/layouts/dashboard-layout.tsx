'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Settings,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-48 transform bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-3 border-b border-border">
            <Link href="/dashboard" className="flex items-center">
              <Image 
                src="/logo.png" 
                alt="Skaldi" 
                width={120} 
                height={120}
                className="object-contain"
              />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav
            className="flex-1 space-y-0.5 px-2 py-2 overflow-y-auto"
            aria-label="Main navigation"
          >
            {navigation.map((item) => {
              const isActive = item.href === '/dashboard' 
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors border-l-2 border-transparent',
                    isActive
                      ? 'bg-muted text-foreground border-primary'
                      : 'hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <Separator />

          {/* User menu */}
          <div className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs hover:bg-muted transition-colors">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">AD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-xs">Admin User</p>
                    <p className="text-[10px] text-muted-foreground">admin@skaldi.com</p>
                  </div>
                  <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-48">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-10 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-3 lg:px-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search */}
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">S</span>
                </div>
                <span className="text-sm font-semibold tracking-tight">Skaldi</span>
              </Link>
            </div>
          </div>

        </header>

        {/* Page content */}
        <main className="p-3 md:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
