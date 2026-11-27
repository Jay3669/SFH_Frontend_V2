import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Building2 } from 'lucide-react'
import { AdminLayout } from '../../layouts/AdminLayout'
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog'
import { AppTextField } from '../../components/common/AppTextField'
import { AppTooltip } from '../../components/common/Tooltip/AppTooltip'
import { AppButton } from '../../components/common/AppButton'
import { AutoDismissMessage } from '../../components/common/AutoDismissMessage/AutoDismissMessage'
import { Icon } from '../../components/common/Icon/Icon'
import { ApiLoadingIndicator } from '../../components/loaders/ApiLoadingIndicator'
import { TablePagination } from '../../components/tables/TablePagination/TablePagination'
import type { AuthUser } from '../../types/auth.types'
import { createBranch, deleteBranch, getBranches, updateBranch, type Branch, type BranchInput } from './branchService'
import '../inventory/stock.css'
import './branch.css'

const PAGE_SIZE = 10
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'The branch request could not be completed.'

export function BranchManagementPage({
  user,
  onLogout,
}: {
  user: AuthUser
  onLogout: () => void
}) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [dialog, setDialog] = useState<Branch | 'new' | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searchText, setSearchText] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  async function loadBranches() {
    setLoading(true)
    setError('')
    try {
      const response = await getBranches()
      if (!Array.isArray(response.data)) throw new Error('The server did not return a branch list.')
      setBranches(response.data)
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    getBranches()
      .then((response) => {
        if (!Array.isArray(response.data)) throw new Error('The server did not return a branch list.')
        if (active) setBranches(response.data)
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const filteredBranches = useMemo(() => {
    const term = search.toLowerCase()
    if (!term) return branches
    return branches.filter((branch) =>
      [branch.name, branch.code, branch.address, branch.phone, branch.email]
        .some((value) => value?.toLowerCase().includes(term)),
    )
  }, [branches, search])

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / PAGE_SIZE))
  const visibleBranches = filteredBranches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function saveBranch(input: BranchInput, branch?: Branch) {
    if (branch) await updateBranch(branch.id, input)
    else await createBranch(input)
    setDialog(null)
    setNotice(branch ? 'Branch updated.' : 'Branch created.')
    await loadBranches()
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchText.trim())
  }

  function resetFilters() {
    setSearchText('')
    setSearch('')
    setPage(1)
  }

  const confirmDelete = async () => {
    if (!deleteCandidate) return
    setError('')
    setNotice('')
    try {
      await deleteBranch(deleteCandidate.id)
      setNotice(`${deleteCandidate.name} deleted.`)
      setDeleteCandidate(null)
      await loadBranches()
    } catch (deleteError) {
      setError(errorMessage(deleteError))
      setDeleteCandidate(null)
    }
  }

  return (
    <AdminLayout user={user} roleLabel="Administrator" sectionTitle="Branch management" onLogout={onLogout}>
      <main className="stock-page branch-page">
        <div className="stock-page-heading">
          <div>
            <p className="eyebrow">LOCATION CONTROL</p>
            <h1>Branch management</h1>
            <p className="stock-subtitle">Manage locations and keep stock, menu, recipes, and daily operations separate by branch.</p>
          </div>
          <button className="sfh-button" type="button" onClick={() => setDialog('new')}>
            <Icon name="add" size={16} /> Add branch
          </button>
        </div>

        <section className="stock-metrics branch-metrics" aria-label="Branch summary">
          <MetricCard label="Total branches" value={branches.length} icon={<Building2 size={20} />} tone="gold" />
          <MetricCard label="With phone" value={branches.filter((branch) => branch.phone).length} icon="☎" tone="blue" />
          <MetricCard label="With address" value={branches.filter((branch) => branch.address).length} icon="⌖" tone="green" />
        </section>

        {notice && (
          <AutoDismissMessage message={notice} onDismiss={() => setNotice('')}>
            <div className="stock-notice" role="status">
              <span>{notice}</span>
              <button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" size={16} /></button>
            </div>
          </AutoDismissMessage>
        )}
        {error && (
          <AutoDismissMessage message={error} onDismiss={() => setError('')}>
            <div className="stock-error" role="alert">
              <span>{error}</span>
              <button className="sfh-button sfh-button-secondary" type="button" onClick={() => void loadBranches()}>Retry</button>
            </div>
          </AutoDismissMessage>
        )}

        <section className="stock-panel">
          <div className="stock-panel-top">
            <form className="stock-filters branch-filters" onSubmit={submitSearch}>
              <AppTextField
                aria-label="Search branches"
                placeholder="Search name, code, contact or address"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                slotProps={{ input: { startAdornment: <span aria-hidden="true" style={{ paddingRight: 8, color: '#77766F' }}>⌕</span> } }}
              />
              <AppButton variant="contained" type="submit">Search</AppButton>
              <AppTooltip title="Reset filters">
                <AppButton variant="outlined" type="button" aria-label="Reset filters" onClick={resetFilters}>
                  <Icon name="reset" size={14} />
                </AppButton>
              </AppTooltip>
            </form>
          </div>

          {loading ? (
            <div className="stock-empty"><ApiLoadingIndicator label="Loading branches…" compact /></div>
          ) : (
            <BranchesTable
              branches={visibleBranches}
              totalBranches={branches.length}
              onEdit={(branch) => setDialog(branch)}
              onDelete={(branch) => setDeleteCandidate(branch)}
            />
          )}
          {!loading && filteredBranches.length > 0 && (
            <TablePagination
              page={page}
              pageCount={totalPages}
              alwaysShow
              label={`${filteredBranches.length} branch${filteredBranches.length === 1 ? '' : 'es'}`}
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          )}
        </section>
      </main>

      {dialog && (
        <BranchDialog
          branch={dialog === 'new' ? undefined : dialog}
          onClose={() => setDialog(null)}
          onSave={saveBranch}
        />
      )}
      {deleteCandidate && (
        <ConfirmDialog
          title="Delete branch?"
          message={`Permanently delete ${deleteCandidate.name}? Branches containing data cannot be deleted.`}
          confirmLabel="Delete branch"
          icon="delete"
          danger
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => { void confirmDelete() }}
        />
      )}
    </AdminLayout>
  )
}

function MetricCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string | number
  icon: ReactNode
  tone: string
}) {
  return (
    <article className={`stock-metric stock-metric-card-${tone}`}>
      <span className={`stock-metric-icon stock-metric-${tone}`} aria-hidden="true">{icon}</span>
      <div className="stock-metric-copy">
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

function BranchesTable({
  branches,
  totalBranches,
  onEdit,
  onDelete,
}: {
  branches: Branch[]
  totalBranches: number
  onEdit: (branch: Branch) => void
  onDelete: (branch: Branch) => void
}) {
  if (branches.length === 0) {
    return (
      <div className="stock-empty">
        <span className="stock-empty-icon">◈</span>
        <strong>{totalBranches === 0 ? 'No branches yet' : 'No branches found'}</strong>
        <span>{totalBranches === 0 ? 'Add a branch to begin managing locations.' : 'Adjust the search and try again.'}</span>
      </div>
    )
  }

  return (
    <div className="sfh-table-wrap stock-table-wrap">
      <table className="sfh-table stock-table branch-table">
        <thead>
          <tr>
            <th>Branch</th>
            <th>Code</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Address</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((branch) => (
            <tr key={branch.id}>
              <td><span className="stock-item-name">{branch.name}</span></td>
              <td><span className="branch-code">{branch.code}</span></td>
              <td>{branch.phone || '—'}</td>
              <td>{branch.email || '—'}</td>
              <td>{branch.address || '—'}</td>
              <td>
                <div className="stock-row-actions">
                  <AppTooltip title={`Edit ${branch.name}`}>
                    <button type="button" aria-label={`Edit ${branch.name}`} onClick={() => onEdit(branch)}>
                      <Icon name="edit" size={14} />
                    </button>
                  </AppTooltip>
                  <AppTooltip title={`Delete ${branch.name}`}>
                    <button
                      type="button"
                      className="stock-archive-action"
                      aria-label={`Delete ${branch.name}`}
                      disabled={totalBranches < 2}
                      onClick={() => onDelete(branch)}
                    >
                      <Icon name="delete" size={14} />
                    </button>
                  </AppTooltip>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BranchModal({
  title,
  description,
  onClose,
  children,
}: {
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="stock-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="stock-modal" role="dialog" aria-modal="true" aria-labelledby="branch-modal-title">
        <div className="stock-modal-heading">
          <div>
            <h2 id="branch-modal-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" className="stock-modal-close" aria-label="Close dialog" onClick={onClose}>
            <Icon name="close" size={17} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

function BranchDialog({
  branch,
  onClose,
  onSave,
}: {
  branch?: Branch
  onClose: () => void
  onSave: (input: BranchInput, branch?: Branch) => Promise<void>
}) {
  const [name, setName] = useState(branch?.name ?? '')
  const [code, setCode] = useState(branch?.code ?? '')
  const [phone, setPhone] = useState(branch?.phone ?? '')
  const [email, setEmail] = useState(branch?.email ?? '')
  const [address, setAddress] = useState(branch?.address ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveError('')
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      }, branch)
    } catch (requestError) {
      setSaveError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <BranchModal
      title={branch ? 'Edit branch' : 'Add branch'}
      description={branch ? 'Update the branch location and contact details.' : 'Create a location for operations and reporting.'}
      onClose={onClose}
    >
      <form className="stock-form sfh-dialog-form" onSubmit={submit}>
        <div className="stock-form-grid">
          <label>
            Branch name
            <AppTextField
              placeholder="Branch name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Branch code
            <AppTextField
              placeholder="Branch code"
              required
              value={code}
              slotProps={{ htmlInput: { maxLength: 20 } }}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </label>
          <label>
            Phone
            <AppTextField
              placeholder="Phone number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <label>
            Email
            <AppTextField
              placeholder="branch@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="branch-address-field">
            Address
            <AppTextField
              placeholder="Branch address"
              multiline
              minRows={3}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </label>
        </div>
        {saveError && (
          <p className="stock-form-error" role="alert">{saveError}</p>
        )}
        <div className="stock-modal-actions">
          <button className="sfh-button sfh-button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="sfh-button" type="submit" disabled={saving}>
            {saving ? 'Saving…' : branch ? 'Save changes' : 'Create branch'}
          </button>
        </div>
      </form>
    </BranchModal>
  )
}
