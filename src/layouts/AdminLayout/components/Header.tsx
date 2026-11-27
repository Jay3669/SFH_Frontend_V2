import { useEffect, useState } from 'react'
import type { AuthUser } from '../../../types/auth.types'
import { Icon } from '../../../components/common/Icon/Icon'
import { ConfirmDialog } from '../../../components/dialogs/ConfirmDialog'
import { FormControl, IconButton, MenuItem, Select, Stack } from '@mui/material'
import { getActiveBranchId, getBranches, setActiveBranchId, type Branch } from '../../../features/branches/branchService'

export function Header({
    user,
    roleLabel,
    sectionTitle = 'Overview',
    onLogout,
}: {
    user: AuthUser
    roleLabel: string
    sectionTitle?: string
    onLogout: () => void
}) {
    const [confirmLogout, setConfirmLogout] = useState(false)
    const [branches, setBranches] = useState<Branch[]>([])
    const [activeBranchId, setActiveBranchIdState] = useState(getActiveBranchId() ?? '')
    const [branchError, setBranchError] = useState('')

    useEffect(() => {
        let active = true
        getBranches()
            .then((response) => {
                if (!Array.isArray(response.data)) throw new Error('The server did not return branches.')
                if (!active) return
                setBranches(response.data)
                const storedBranchId = getActiveBranchId()
                const fallback = response.data.find((branch) => branch.code === 'MAIN') ?? response.data[0]
                const selected = response.data.find((branch) => branch.id === storedBranchId) ?? fallback
                if (selected) {
                    setActiveBranchIdState(selected.id)
                    if (storedBranchId !== selected.id) {
                        setActiveBranchId(selected.id)
                        if (storedBranchId) window.location.reload()
                    }
                }
                setBranchError('')
            })
            .catch((error: unknown) => {
                if (active) setBranchError(error instanceof Error ? error.message : 'Branches could not be loaded.')
            })
        return () => { active = false }
    }, [])

    const changeBranch = (branchId: string) => {
        setActiveBranchId(branchId)
        setActiveBranchIdState(branchId)
        window.location.reload()
    }

    return (
        <header className="dashboard-header">
            <Stack direction="row" spacing={2} sx={{ minWidth: 0, alignItems: 'center' }}>
                <div className="breadcrumb">Workspace <span>/</span> {sectionTitle}</div>
                {branches.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                            value={activeBranchId}
                            aria-label="Active branch"
                            onChange={(event) => changeBranch(event.target.value)}
                        >
                            {branches.map((branch) => (
                                <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
                {branchError && <span role="alert" title={branchError} style={{ color: '#b42318', fontSize: 12 }}>Branch unavailable</span>}
            </Stack>
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
