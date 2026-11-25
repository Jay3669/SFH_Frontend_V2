import type { ReactNode } from 'react'
import { useState } from 'react'
import type { AuthUser } from '../../types/auth.types'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'

export function AdminLayout({
  user,
  roleLabel,
  sectionTitle,
  onLogout,
  children,
}: {
  user: AuthUser
  roleLabel: string
  sectionTitle?: string
  onLogout: () => void
  children: ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <main className="dashboard">
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <Sidebar
        userRole={user.role}
        permissions={user.permissions}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />
      <section className="dashboard-content">
        <Header
          user={user}
          roleLabel={roleLabel}
          sectionTitle={sectionTitle}
          onLogout={onLogout}
          onMenu={() => setSidebarOpen(true)}
        />
        {children}
      </section>
    </main>
  )
}
