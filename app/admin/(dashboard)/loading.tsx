/**
 * Route-level loading for the dashboard area ("switcher"). `loading.tsx`
 * instantiates a Suspense boundary around the segment, so it renders while
 * the guarded layout and the target page stream in — including cold jumps
 * from /admin/login into the shell.
 */
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminDashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row" aria-busy="true" aria-label="Loading dashboard">
      {/* Sidebar placeholder */}
      <aside className="lg:w-60 lg:shrink-0">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2 px-2">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="space-y-2">
            {['Overview', 'Users', 'Orders', 'Sign out'].map((label) => (
              <Skeleton key={label} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </aside>

      {/* Content placeholder mirrors the overview page shape */}
      <div className="min-w-0 flex-1 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Skeleton className="min-h-24" />
          <Skeleton className="min-h-24" />
          <Skeleton className="min-h-24" />
          <Skeleton className="min-h-24" />
        </div>
        <Skeleton className="min-h-64" />
      </div>
    </div>
  )
}
