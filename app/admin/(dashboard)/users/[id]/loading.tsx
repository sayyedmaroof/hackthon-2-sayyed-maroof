/**
 * Profile-shaped loading fallback for /admin/users/[id].
 */
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminUserProfileLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-5 w-24" />
      {/* Hero card */}
      <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex gap-6">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2 text-center">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="mx-auto h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
      {/* Orders + cart columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Skeleton className="min-h-48" />
        </div>
        <Skeleton className="min-h-48" />
      </div>
    </div>
  )
}
