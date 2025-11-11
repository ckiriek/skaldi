import { DashboardLayout as Layout } from '@/components/layouts/dashboard-layout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Layout>{children}</Layout>
}
