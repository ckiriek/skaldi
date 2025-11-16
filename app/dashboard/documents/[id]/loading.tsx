import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DocumentDetailLoading() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header skeleton */}
      <div>
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <Skeleton className="h-7 w-56" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </div>

      <Skeleton className="h-px w-full" />

      {/* Info cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-base">
                <Skeleton className="h-4 w-28" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs content skeleton */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Skeleton className="h-4 w-36" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="mt-2 h-3 w-56" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
