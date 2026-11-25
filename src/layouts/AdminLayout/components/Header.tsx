import { useState } from 'react'
import type { AuthUser } from '../../../types/auth.types'
import { Icon } from '../../../components/common/Icon/Icon'
import { ConfirmDialog } from '../../../components/dialogs/ConfirmDialog'
import { IconButton } from '@mui/material'
import { Menu } from 'lucide-react'

export function Header({
    user,
    roleLabel,
    sectionTitle = 'Overview',
    onLogout,
    onMenu,
}: {
    user: AuthUser
    roleLabel: string
    sectionTitle?: string
    onLogout: () => void
    onMenu?: () => void
}) {
    const [confirmLogout, setConfirmLogout] = useState(false)

    return (
        <header className="dashboard-header">
            {onMenu && (
                <IconButton
                    className="mobile-menu-button"
                    onClick={onMenu}
                    aria-label="Open navigation"
                >
                    <Menu size={20} />
                </IconButton>
            )}
            <div className="breadcrumb">Workspace <span>/</span> {sectionTitle}</div>
            <IconButton className="profile-button" onClick={() => setConfirmLogout(true)} aria-label="Open profile and sign out">
                <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="profile-name">{user.name}<small>{roleLabel} · Sign out</small></span>
                <span className="logout-caret"><Icon name="logout" size={16} /></span>
            </IconButton>
            {confirmLogout && <ConfirmDialog
                title="Sign out?"
                message="Are you sure you want to sign out of your account?"
                confirmLabel="Sign out"
                icon="logout"
                danger={false}
                onCancel={() => setConfirmLogout(false)}
                onConfirm={() => {
                    setConfirmLogout(false)
                    onLogout()
                }}
            />}
        </header>
    )
}
