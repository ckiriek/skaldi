import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton'

export default function DocumentsLoading() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg">
              <Skeleton className="h-4 w-32" />
            </CardTitle>
            <CardDescription className="text-sm">
              <Skeleton className="mt-2 h-3 w-48" />
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <SkeletonTable rows={5} columns={5} />
        </CardContent>
      </Card>
    </div>
  )
}
