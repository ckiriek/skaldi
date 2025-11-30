'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { User, Lock, Check, AlertCircle, Camera, Loader2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  organization: string | null
  role: string
  avatar_url: string | null
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile from users table
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (userData) {
        setProfile({
          id: user.id,
          email: user.email || '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          organization: userData.organization || '',
          role: userData.role || 'viewer',
          avatar_url: userData.avatar_url
        })
      } else {
        // Create profile if doesn't exist
        setProfile({
          id: user.id,
          email: user.email || '',
          first_name: '',
          last_name: '',
          organization: '',
          role: 'viewer',
          avatar_url: null
        })
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    
    setSaving(true)
    setSuccess('')
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('users')
        .upsert({
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          organization: profile.organization,
          role: profile.role,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        })

      if (updateError) throw updateError
      setSuccess('Profile saved successfully!')
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setUploadingAvatar(true)
    setError('')

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update profile with avatar URL
      const avatarUrl = `${publicUrl}?t=${Date.now()}` // Cache bust
      
      const { error: updateError } = await supabase
        .from('users')
        .upsert({
          id: profile.id,
          email: profile.email,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: avatarUrl })
      setSuccess('Avatar updated!')
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setError('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwords.new || !passwords.confirm) {
      setError('Please fill in all password fields')
      return
    }
    if (passwords.new !== passwords.confirm) {
      setError('New passwords do not match')
      return
    }
    if (passwords.new.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setSaving(true)
    setSuccess('')
    setError('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwords.new
      })

      if (updateError) throw updateError
      
      setSuccess('Password updated successfully!')
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (err: any) {
      console.error('Error changing password:', err)
      setError(err.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    
    setDeleting(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Delete all user's projects (cascades to documents)
      await supabase.from('projects').delete().eq('created_by', user.id)
      
      // Delete user profile
      await supabase.from('users').delete().eq('id', user.id)
      
      // Sign out
      await supabase.auth.signOut()
      
      // Redirect to home
      router.push('/')
    } catch (err: any) {
      console.error('Error deleting account:', err)
      setError(err.message || 'Failed to delete account')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="py-2 border-emerald-200 bg-emerald-50 text-emerald-800">
          <Check className="h-3.5 w-3.5" />
          <AlertDescription className="text-sm">{success}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="error" className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Two columns layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Profile Section */}
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <User className="h-4 w-4" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            {/* Avatar + Name row */}
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0">
                <div 
                  onClick={handleAvatarClick}
                  className="w-12 h-12 rounded-full bg-muted flex items-center justify-center cursor-pointer overflow-hidden border border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <button
                  onClick={handleAvatarClick}
                  className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-primary text-primary-foreground rounded-full shadow hover:bg-primary/90"
                >
                  <Camera className="h-2.5 w-2.5" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="firstName" className="text-xs">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile?.first_name || ''}
                    onChange={(e) => setProfile(p => p ? {...p, first_name: e.target.value} : null)}
                    placeholder="John"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile?.last_name || ''}
                    onChange={(e) => setProfile(p => p ? {...p, last_name: e.target.value} : null)}
                    placeholder="Doe"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Email & Org */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" type="email" value={profile?.email || ''} disabled className="h-7 text-xs bg-muted" />
              </div>
              <div>
                <Label htmlFor="organization" className="text-xs">Organization</Label>
                <Input
                  id="organization"
                  value={profile?.organization || ''}
                  onChange={(e) => setProfile(p => p ? {...p, organization: e.target.value} : null)}
                  placeholder="Company"
                  className="h-7 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="h-6 text-xs px-3">
                {saving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Saving...</> : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Lock className="h-4 w-4" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-3">
            <div>
              <Label htmlFor="newPassword" className="text-xs">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords(p => ({...p, new: e.target.value}))}
                placeholder="••••••••"
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-xs">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords(p => ({...p, confirm: e.target.value}))}
                placeholder="••••••••"
                className="h-7 text-xs"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button 
                size="sm"
                onClick={handleChangePassword} 
                disabled={saving || !passwords.new || !passwords.confirm}
                variant="outline"
                className="h-6 text-xs px-3"
              >
                {saving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Updating...</> : 'Update Password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700">Danger Zone</p>
            <p className="text-xs text-red-500">Delete your account and all data permanently</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700"
          onClick={() => setDeleteDialogOpen(true)}
        >
          Delete Account
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and all associated projects and documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm">
              To confirm, type <span className="font-mono font-bold">DELETE</span> below:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              placeholder="Type DELETE to confirm"
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteDialogOpen(false)
              setDeleteConfirmText('')
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
            >
              {deleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                'Delete Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
