import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// import { ScrollArea } from '@/components/ui/scroll-area'
import { History, FileText, CheckCircle, AlertTriangle, User } from 'lucide-react'

interface AuditLogEntry {
  id: string
  created_at: string
  action: string
  actor_user_id: string
  diff_json?: any
  details?: any
}

interface AuditLogViewerProps {
  logs: AuditLogEntry[]
}

export function AuditLogViewer({ logs }: AuditLogViewerProps) {
  const getActionIcon = (action: string) => {
    if (action.includes('generate')) return FileText
    if (action.includes('validate')) return CheckCircle
    if (action.includes('error')) return AlertTriangle
    return History
  }

  const getActionColor = (action: string) => {
    if (action.includes('generate')) return 'text-blue-500 bg-blue-50 border-blue-200'
    if (action.includes('validate')) return 'text-emerald-500 bg-emerald-50 border-emerald-200'
    if (action.includes('error')) return 'text-red-500 bg-red-50 border-red-200'
    return 'text-gray-500 bg-gray-50 border-gray-200'
  }

  const formatActionLabel = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <Card className="border-none shadow-none">
      <CardContent className="p-0">
        <div className="overflow-y-auto h-[600px] pr-4">
          <div className="space-y-8 relative pl-8 py-4">
            {/* Timeline Line */}
            <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-border" />

            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No audit history available.
              </div>
            ) : (
              logs.map((log) => {
                const Icon = getActionIcon(log.action)
                const colorClass = getActionColor(log.action)
                
                return (
                  <div key={log.id} className="relative flex gap-4 group">
                    {/* Timeline Dot */}
                    <div className={`absolute left-[-32px] p-1.5 rounded-full border ${colorClass} z-10`}>
                      <Icon className="w-3 h-3" />
                    </div>

                    <div className="flex-1 bg-card border rounded-lg p-3 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {formatActionLabel(log.action)}
                          {log.diff_json?.version && (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                              v{log.diff_json.version}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                         <User className="w-3 h-3" />
                         <span>{log.actor_user_id === 'system' ? 'System' : 'User'}</span>
                      </div>

                      {log.diff_json && (
                        <div className="text-xs bg-muted/50 p-2 rounded border font-mono overflow-hidden text-ellipsis whitespace-nowrap max-w-xs sm:max-w-md">
                          {JSON.stringify(log.diff_json).slice(0, 100)}
                          {JSON.stringify(log.diff_json).length > 100 && '...'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
