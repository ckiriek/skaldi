import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Continue work card skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-56" />
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </CardContent>
      </Card>

      {/* Recent Projects / Documents skeletons */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
