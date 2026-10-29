import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { AdminShell } from '@/components/admin/admin-shell'

/** Guard: every page below /admin requires a valid admin session cookie. */
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/login')
  }
  return <AdminShell>{children}</AdminShell>
}
