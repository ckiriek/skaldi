import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProjectDetailLoading() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-64" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>

      {/* Info cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-base">
                <Skeleton className="h-4 w-24" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs content skeleton */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Skeleton className="h-4 w-28" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="mt-2 h-3 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
