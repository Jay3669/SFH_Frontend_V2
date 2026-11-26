import type { ReactNode } from 'react'
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
  return (
    <main className="dashboard">
      <Sidebar
        userRole={user.role}
        permissions={user.permissions}
      />
      <section className="dashboard-content">
        <Header
          user={user}
          roleLabel={roleLabel}
          sectionTitle={sectionTitle}
          onLogout={onLogout}
        />
        {children}
      </section>
    </main>
  )
}
