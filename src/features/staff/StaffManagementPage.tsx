import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Alert, Avatar, Button, Card, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead,
  TablePagination, TableRow, TextField,
} from '@mui/material'
import { ArrowLeft, ArrowRight, BadgeIndianRupee, BriefcaseBusiness, CalendarDays, Check, CircleCheck, Download, MapPin, Plus, Save, ShieldCheck, UserRound, UsersRound, WalletCards } from 'lucide-react'
import { AdminLayout } from '../../layouts/AdminLayout'
import { AppSelect } from '../../components/common/AppSelect'
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog'
import { ApiLoadingIndicator } from '../../components/loaders/ApiLoadingIndicator'
import { AutoDismissMessage } from '../../components/common/AutoDismissMessage/AutoDismissMessage'
import { routes } from '../../app/router/routes'
import type { AuthUser } from '../../types/auth.types'
import { authenticatedApiRequest } from '../../services/api/apiClient'
import {
  approveProfitSharing, calculateDailyProfitSharing, getDailyProfitSharing,
  rejectProfitSharing, type ProfitSharingCalculation,
} from '../profitSharing/profitSharingService'
import {
  assignStaffRole, createStaff, deactivateStaff, getStaff, getStaffRoleAssignments,
  getStaffRoles, removeStaffRole, updateStaff, type StaffEmploymentStatus,
  type StaffJobRole, type StaffMember, type StaffRole, type StaffRoleAssignment,
  type StaffUpdateInput,
} from './staffService'
import './staff.css'

type View = 'overview' | 'list' | 'create' | 'roles' | 'daily' | 'profit' | 'payments' | 'reports'
const roleLabel: Record<StaffRole, string> = { manager: 'Manager', cashier: 'Cashier', employee: 'Employee' }
const today = () => new Date().toLocaleDateString('en-CA')
const money = (value: number | string) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const errorText = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.'

function viewFromPath(path: string): View {
  if (path === '/admin/reports') return 'reports'
  if (path.endsWith('/list')) return 'list'
  if (path.endsWith('/create')) return 'create'
  if (path.endsWith('/roles')) return 'roles'
  if (path.endsWith('/daily-work')) return 'daily'
  if (path.endsWith('/profit-sharing')) return 'profit'
  if (path.endsWith('/payments')) return 'payments'
  if (path.endsWith('/reports')) return 'reports'
  return 'overview'
}

export function StaffManagementPage({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const view = viewFromPath(location.pathname)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [roles, setRoles] = useState<StaffJobRole[]>([])
  const [calculations, setCalculations] = useState<ProfitSharingCalculation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [staffResponse, roleResponse, profitResponse] = await Promise.all([getStaff(), getStaffRoles(), getDailyProfitSharing()])
      setStaff(staffResponse.data ?? [])
      setRoles(roleResponse.data ?? [])
      setCalculations(profitResponse.data ?? [])
    } catch (loadError) {
      setError(errorText(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([getStaff(), getStaffRoles(), getDailyProfitSharing()])
      .then(([staffResponse, roleResponse, profitResponse]) => {
        if (!active) return
        setStaff(staffResponse.data ?? [])
        setRoles(roleResponse.data ?? [])
        setCalculations(profitResponse.data ?? [])
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorText(loadError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const tabs: Array<[string, string]> = [
    ['Overview', routes.staffManagement], ['All staff', routes.staffList], ['Roles', routes.staffRoles],
    ['Daily work', routes.staffDailyWork], ['Profit sharing', routes.staffProfitSharing],
    ['Payments', routes.staffPayments], ['Reports', routes.staffReports],
  ]
  const go = (path: string) => navigate(path)

  return (
    <AdminLayout user={user} roleLabel="Administrator" sectionTitle="Staff management" onLogout={onLogout}>
      <main className="staff-page">
        <header className="staff-heading">
          <div><p className="eyebrow">PEOPLE &amp; OPERATIONS</p><h1>{title(view)}</h1><p>{description(view)}</p></div>
          {view !== 'create' && <Button variant="contained" startIcon={<Plus size={17} />} onClick={() => go(routes.staffCreate)}>Add staff</Button>}
        </header>
        <nav className="staff-view-tabs" aria-label="Staff management sections">
          {tabs.map(([label, path]) => (
            <button type="button" key={path} className={location.pathname === path ? 'active' : ''} onClick={() => go(path)}>{label}</button>
          ))}
        </nav>
        {error && <AutoDismissMessage message={error} onDismiss={() => setError('')}><Alert severity="error" sx={{ mb: 2 }}>{error}</Alert></AutoDismissMessage>}
        {notice && <AutoDismissMessage message={notice} onDismiss={() => setNotice('')}><Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert></AutoDismissMessage>}
        {loading ? (
          <ApiLoadingIndicator label="Loading staff…" compact />
        ) : (
          <>
            {view === 'overview' && <Overview staff={staff} calculations={calculations} go={go} />}
            {view === 'list' && <StaffList staff={staff} roles={roles} reload={load} setNotice={setNotice} setError={setError} />}
            {view === 'create' && <Onboarding roles={roles} onClose={() => go(routes.staffList)} onCreated={(member) => { setNotice(`${member.firstName} ${member.lastName} onboarded successfully.`); void load(); go(routes.staffList) }} setError={setError} />}
            {view === 'roles' && <RolesView staff={staff} roles={roles} reload={load} setNotice={setNotice} setError={setError} />}
            {view === 'daily' && <DailyView staff={staff} roles={roles} calculations={calculations} reload={load} setNotice={setNotice} setError={setError} />}
            {view === 'profit' && <ProfitView calculations={calculations} reload={load} setNotice={setNotice} setError={setError} />}
            {view === 'payments' && <PaymentsView staff={staff} calculations={calculations} setNotice={setNotice} setError={setError} />}
            {view === 'reports' && <ReportsView staff={staff} calculations={calculations} />}
          </>
        )}
      </main>
    </AdminLayout>
  )
}

function StaffList({ staff, roles, reload, setNotice, setError }: {
  staff: StaffMember[]; roles: StaffJobRole[]; reload: () => Promise<void>;
  setNotice: (value: string) => void; setError: (value: string) => void
}) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState(10)
  const [edit, setEdit] = useState<StaffMember | null>(null)
  const [assign, setAssign] = useState<StaffMember | null>(null)
  const [confirm, setConfirm] = useState<StaffMember | null>(null)
  const filtered = useMemo(() => staff.filter((member) => {
    const query = search.toLowerCase()
    const matches = !query || [member.firstName, member.lastName, member.email, member.phoneNumber, member.profile?.employeeId].some((value) => value?.toLowerCase().includes(query))
    return matches && (role === 'all' || member.role === role) && (status === 'all' || (status === 'inactive' ? !member.isActive : member.profile?.employmentStatus === status))
  }), [staff, search, role, status])

  async function deactivate(member: StaffMember) {
    setConfirm(null)
    try { await deactivateStaff(member.id); setNotice(`${member.firstName} ${member.lastName} deactivated.`); await reload() }
    catch (error) { setError(errorText(error)) }
  }

  function exportCsv() {
    const data = [['Employee ID', 'Name', 'Phone', 'Email', 'Role', 'Department', 'Status'],
      ...filtered.map((member) => [member.profile?.employeeId || '', `${member.firstName} ${member.lastName}`, member.phoneNumber || '', member.email || '', roleLabel[member.role], member.profile?.employmentStatus || 'active'])]
    downloadCsv(data, 'staff-directory.csv')
  }

  return (
    <Card className="staff-table-card"><CardContent>
      <div className="staff-toolbar-mui">
        <TextField size="small" label="Search staff" value={search} onChange={(event) => setSearch(event.target.value)} />
        <AppSelect size="small" label="Role" value={role} onChange={(event) => setRole(event.target.value)} options={[
          { value: 'all', label: 'All roles' },
          { value: 'manager', label: 'Manager' },
          { value: 'cashier', label: 'Cashier' },
          { value: 'employee', label: 'Employee' },
        ]} />
        <AppSelect size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} options={[
          { value: 'all', label: 'All statuses' },
          { value: 'active', label: 'Active' },
          { value: 'on_leave', label: 'On leave' },
          { value: 'inactive', label: 'Inactive' },
        ]} />
        <Button variant="outlined" startIcon={<Download size={16} />} onClick={exportCsv}>Export CSV</Button>
      </div>
      <Table size="small" className="staff-table-mui"><TableHead><TableRow><TableCell>Staff member</TableCell><TableCell>Employee ID</TableCell><TableCell>Phone</TableCell><TableCell>Role</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
        <TableBody>{filtered.slice(page * rows, page * rows + rows).map((member) => (
          <TableRow key={member.id} hover>
            <TableCell><div className="staff-person"><Avatar>{member.firstName[0]}{member.lastName[0]}</Avatar><div><strong>{member.firstName} {member.lastName}</strong><span>{member.email || 'No email'}</span></div></div></TableCell>
            <TableCell>{member.profile?.employeeId || '—'}</TableCell><TableCell>{member.phoneNumber || '—'}</TableCell>
            <TableCell><Chip size="small" label={roleLabel[member.role]} /></TableCell>
            <TableCell><Chip size="small" color={!member.isActive ? 'default' : member.profile?.employmentStatus === 'on_leave' ? 'warning' : 'success'} label={!member.isActive ? 'Inactive' : member.profile?.employmentStatus === 'on_leave' ? 'On leave' : 'Active'} /></TableCell>
            <TableCell align="right"><div className="staff-row-actions"><Button size="small" onClick={() => setEdit(member)}>Edit</Button><Button size="small" onClick={() => setAssign(member)}>Roles</Button>{member.isActive && <Button size="small" color="error" onClick={() => setConfirm(member)}>Deactivate</Button>}</div></TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
      <TablePagination component="div" count={filtered.length} page={page} rowsPerPage={rows} onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={(event) => { setRows(Number(event.target.value)); setPage(0) }} />
      {edit && <EditDialog member={edit} onClose={() => setEdit(null)} reload={reload} setNotice={setNotice} setError={setError} />}
      {assign && <AssignmentDialog member={assign} roles={roles} onClose={() => setAssign(null)} reload={reload} setNotice={setNotice} setError={setError} />}
      {confirm && <ConfirmDialog title="Deactivate staff?" message={`Deactivate ${confirm.firstName} ${confirm.lastName}?`} confirmLabel="Deactivate" icon="deactivate" onCancel={() => setConfirm(null)} onConfirm={() => void deactivate(confirm)} />}
    </CardContent></Card>
  )
}

function title(view: View) {
  return { overview: 'Staff overview', list: 'All staff', create: 'Add staff', roles: 'Staff roles', daily: 'Daily work & allocation', profit: 'Profit sharing', payments: 'Staff payments', reports: 'Staff reports' }[view]
}
function description(view: View) {
  return { overview: 'Monitor people, approvals, allocations, and pending actions.', list: 'Search, filter, edit, and manage employee profiles.', create: 'Complete guided onboarding and configure job roles.', roles: 'Configure roles and employee-specific profit percentages.', daily: 'Record attendance and review role-based daily allocations.', profit: 'Calculate, review, and approve daily net-profit allocations.', payments: 'Record approved profit payments and track balances.', reports: 'Export staff, profit, attendance, and payment reports.' }[view]
}

function Overview({ staff, calculations, go }: { staff: StaffMember[]; calculations: ProfitSharingCalculation[]; go: (path: string) => void }) {
  const active = staff.filter((member) => member.isActive && member.profile?.employmentStatus !== 'inactive').length
  const leave = staff.filter((member) => member.profile?.employmentStatus === 'on_leave').length
  const pending = calculations.filter((item) => item.status === 'pending_approval')
  const cards = [
    ['Total staff', staff.length, UsersRound],
    ['Active staff', active, CircleCheck],
    ['On leave', leave, CalendarDays],
    ['Pending approvals', pending.length, ShieldCheck],
  ] as const
  const recent = [...staff].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <>
      <section className="staff-metrics-grid">
        {cards.map(([label, value, Icon]) => (
          <Card key={label}><CardContent><div className="staff-metric-icon"><Icon size={20} /></div><span>{label}</span><strong>{value}</strong></CardContent></Card>
        ))}
      </section>
      <section className="staff-overview-grid">
        <Card className="staff-overview-card"><CardContent>
          <div className="staff-card-heading"><div><p>RECENT STAFF</p><h2>Recently onboarded</h2></div><Button size="small" onClick={() => go(routes.staffList)}>View all</Button></div>
          {recent.length === 0 ? <div className="staff-empty-state"><UsersRound size={28} /><strong>No staff profiles</strong></div> : recent.map((member) => (
            <div className="staff-recent-row" key={member.id}>
              <Avatar>{member.firstName[0]}{member.lastName[0]}</Avatar>
              <div><strong>{member.firstName} {member.lastName}</strong><span>{member.profile?.employeeId || roleLabel[member.role]}</span></div>
              <Chip size="small" color={member.isActive ? 'success' : 'default'} label={member.isActive ? 'Active' : 'Inactive'} />
            </div>
          ))}
        </CardContent></Card>
        <Card className="staff-overview-card"><CardContent>
          <div className="staff-card-heading"><div><p>DAILY OPERATIONS</p><h2>Pending allocations</h2></div><Button size="small" onClick={() => go(routes.staffProfitSharing)}>Review</Button></div>
          {pending.length === 0 ? <div className="staff-empty-state"><CircleCheck size={28} /><strong>All allocations reviewed</strong></div> : pending.slice(0, 5).map((item) => (
            <div className="staff-recent-row" key={item.id}><Avatar><BadgeIndianRupee size={18} /></Avatar><div><strong>{item.businessDate}</strong><span>{money(item.totalProfitShare)} staff share</span></div><Chip size="small" color="warning" label="Pending" /></div>
          ))}
        </CardContent></Card>
      </section>
      <section className="staff-quick-actions">
        <button type="button" onClick={() => go(routes.staffCreate)}><Plus size={18} /> Onboard staff</button>
        <button type="button" onClick={() => go(routes.staffRoles)}><BriefcaseBusiness size={18} /> Manage roles</button>
        <button type="button" onClick={() => go(routes.staffDailyWork)}><CalendarDays size={18} /> Daily work</button>
        <button type="button" onClick={() => go(routes.staffProfitSharing)}><ShieldCheck size={18} /> Approve allocation</button>
        <button type="button" onClick={() => go(routes.staffReports)}><Download size={18} /> Reports</button>
      </section>
    </>
  )
}

function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function EditDialog({ member, onClose, reload, setNotice, setError }: {
  member: StaffMember; onClose: () => void; reload: () => Promise<void>;
  setNotice: (value: string) => void; setError: (value: string) => void
}) {
  const [form, setForm] = useState({
    firstName: member.firstName, lastName: member.lastName, role: member.role,
    joiningDate: member.profile?.joiningDate ?? '', employmentStatus: member.profile?.employmentStatus ?? 'active',
  })
  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const input: StaffUpdateInput = { firstName: form.firstName, lastName: form.lastName, role: form.role,
        joiningDate: form.joiningDate || undefined, employmentStatus: form.employmentStatus as StaffEmploymentStatus }
      await updateStaff(member.id, input)
      setNotice('Staff details updated.')
      onClose()
      await reload()
    } catch (error) { setError(errorText(error)) }
  }
  return (
    <Dialog open fullWidth maxWidth="sm" className="sfh-form-dialog" onClose={onClose}><DialogTitle>Edit staff profile</DialogTitle>
      <form className="sfh-dialog-form" onSubmit={(event) => void submit(event)}><DialogContent className="staff-dialog-grid">
        <TextField label="First name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required />
        <TextField label="Last name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
        <AppSelect label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as StaffRole })} options={[
          { value: 'manager', label: 'Manager' },
          { value: 'cashier', label: 'Cashier' },
          { value: 'employee', label: 'Employee' },
        ]} />
        <AppSelect label="Status" value={form.employmentStatus} onChange={(event) => setForm({ ...form, employmentStatus: event.target.value as StaffEmploymentStatus })} options={[
          { value: 'active', label: 'Active' },
          { value: 'on_leave', label: 'On leave' },
          { value: 'inactive', label: 'Inactive' },
        ]} />
        <TextField label="Joining date" type="date" value={form.joiningDate} onChange={(event) => setForm({ ...form, joiningDate: event.target.value })} />
      </DialogContent><DialogActions><Button variant="outlined" onClick={onClose}>Cancel</Button><Button variant="contained" type="submit">Save</Button></DialogActions></form>
    </Dialog>
  )
}

function AssignmentDialog({ member, roles, onClose, reload, setNotice, setError }: {
  member: StaffMember; roles: StaffJobRole[]; onClose: () => void; reload: () => Promise<void>;
  setNotice: (value: string) => void; setError: (value: string) => void
}) {
  const [assignments, setAssignments] = useState<StaffRoleAssignment[]>([])
  const [roleId, setRoleId] = useState('')
  const [percentage, setPercentage] = useState('0')
  const [loading, setLoading] = useState(true)
  useEffect(() => { getStaffRoleAssignments(member.id).then((response) => setAssignments(response.data ?? [])).catch((error) => setError(errorText(error))).finally(() => setLoading(false)) }, [member.id, setError])
  async function add() {
    const value = Number(percentage)
    if (!roleId || !Number.isFinite(value) || value < 0 || value > 100) return setError('Select a role and enter a valid percentage.')
    if (assignments.some((item) => item.roleId === roleId && item.status === 'active')) return setError('This role is already assigned.')
    try { await assignStaffRole(member.id, { roleId, customProfitPercentage: value, effectiveFrom: today() }); const response = await getStaffRoleAssignments(member.id); setAssignments(response.data ?? []); setNotice('Role assigned.'); await reload() } catch (error) { setError(errorText(error)) }
  }
  async function remove(assignment: StaffRoleAssignment) {
    try { await removeStaffRole(member.id, assignment.id); const response = await getStaffRoleAssignments(member.id); setAssignments(response.data ?? []); setNotice('Role removed.'); await reload() } catch (error) { setError(errorText(error)) }
  }
  return (
    <Dialog open fullWidth maxWidth="md" className="sfh-form-dialog" onClose={onClose}><DialogTitle>Assigned roles — {member.firstName} {member.lastName}</DialogTitle><DialogContent>
      <div className="role-assignment-form"><AppSelect label="Role" value={roleId} onChange={(event) => setRoleId(event.target.value)} displayEmpty options={[
        { value: '', label: 'Select a role', disabled: true },
        ...roles.map((role) => ({ value: role.id, label: role.name })),
      ]} /><TextField label="Profit %" type="number" value={percentage} onChange={(event) => setPercentage(event.target.value)} /><TextField label="Effective from" type="date" value={today()} disabled /><Button variant="contained" onClick={() => void add()}><Plus size={16} /> Add</Button></div>
      {loading ? (
        <ApiLoadingIndicator label="Loading role assignments…" compact />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Role</TableCell>
              <TableCell>Profit share</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assignments.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{roles.find((role) => role.id === item.roleId)?.name || item.roleId}</TableCell>
                <TableCell>{Number(item.customProfitPercentage ?? 0).toFixed(4)}%</TableCell>
                <TableCell><Chip size="small" label={item.status} /></TableCell>
                <TableCell align="right">
                  <Button size="small" color="error" onClick={() => void remove(item)}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </DialogContent><DialogActions><Button onClick={onClose}>Close</Button></DialogActions></Dialog>
  )
}

function Onboarding({ roles, onClose, onCreated, setError }: {
  roles: StaffJobRole[]; onClose: () => void; onCreated: (member: StaffMember) => void; setError: (value: string) => void
}) {
  const [step, setStep] = useState(0)
  const [highestStep, setHighestStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const emptyOnboardingForm = {
    firstName: '', lastName: '', gender: '', dob: '', email: '', phone: '', alternatePhone: '',
    password: '', employeeId: '', joiningDate: today(), employmentType: 'full_time',
    status: 'active' as StaffEmploymentStatus,
    door: '', street: '', city: '', district: '', state: '', country: 'India', pin: '',
  }
  const readDraft = () => {
    try {
      const draft = localStorage.getItem('sfh-staff-onboarding-draft')
      return draft ? JSON.parse(draft) as { form?: typeof emptyOnboardingForm; selected?: Record<string, number> } : {}
    } catch {
      localStorage.removeItem('sfh-staff-onboarding-draft')
      return {}
    }
  }
  const [initialDraft] = useState(readDraft)
  const [form, setForm] = useState<typeof emptyOnboardingForm>(initialDraft.form ?? emptyOnboardingForm)
  const [selected, setSelected] = useState<Record<string, number>>(initialDraft.selected ?? {})
  const roleOptions = useMemo(() => {
    const fallback: StaffJobRole[] = [
      { id: 'manager', name: 'Manager', defaultProfitPercentage: 0 },
      { id: 'cashier', name: 'Cashier', defaultProfitPercentage: 0 },
      { id: 'employee', name: 'Employee', defaultProfitPercentage: 0 },
    ]
    return roles.length > 0
      ? roles.filter((role) => ['manager', 'cashier', 'employee'].includes(role.id))
      : fallback
  }, [roles])
  const steps = [
    { title: 'Personal', description: 'Identity and contact', icon: UserRound },
    { title: 'Address', description: 'Home address', icon: MapPin },
    { title: 'Employment', description: 'Work details', icon: BriefcaseBusiness },
    { title: 'Roles', description: 'Assign responsibilities', icon: ShieldCheck },
    { title: 'Profit share', description: 'Configure percentages', icon: BadgeIndianRupee },
    { title: 'Review', description: 'Confirm and submit', icon: CircleCheck },
  ]
  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const total = Object.values(selected).reduce((sum, value) => sum + value, 0)

  function validateStep(targetStep = step) {
    setValidationMessage('')
    if (targetStep === 0 && (!form.firstName.trim() || !form.lastName.trim())) {
      setValidationMessage('Enter the staff member’s first and last name.')
      return false
    }
    if (targetStep === 0 && !form.email.trim() && !form.phone.trim()) {
      setValidationMessage('Add an email address or phone number.')
      return false
    }
    if (targetStep === 0 && form.password.length < 8) {
      setValidationMessage('Use a temporary password with at least 8 characters.')
      return false
    }
    if (targetStep === 2 && !form.joiningDate) {
      setValidationMessage('Select a joining date.')
      return false
    }
    if (targetStep === 3 && Object.keys(selected).length === 0) {
      setValidationMessage('Select at least one role.')
      return false
    }
    if (targetStep === 4 && Object.values(selected).some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
      setValidationMessage('Every profit percentage must be between 0 and 100.')
      return false
    }
    return true
  }

  function continueStep() {
    if (!validateStep()) return
    const next = Math.min(step + 1, steps.length - 1)
    setHighestStep((current) => Math.max(current, next))
    setStep(next)
  }

  function saveDraft() {
    localStorage.setItem('sfh-staff-onboarding-draft', JSON.stringify({ form, selected }))
    setValidationMessage('')
    setError('')
  }

  async function submit() {
    for (let index = 0; index < 5; index += 1) {
      if (!validateStep(index)) {
        setStep(index)
        return
      }
    }
    setSaving(true)
    try {
      const primaryRole: StaffRole =
        selected.manager !== undefined ? 'manager'
          : selected.cashier !== undefined ? 'cashier'
            : 'employee'
      const response = await createStaff({
        firstName: form.firstName, lastName: form.lastName, email: form.email || undefined, phoneNumber: form.phone || undefined,
        password: form.password, role: primaryRole, employeeId: form.employeeId || undefined,
        joiningDate: form.joiningDate,
        employmentStatus: form.status, address: [form.door, form.street, form.city, form.district, form.state, form.country, form.pin].filter(Boolean).join(', '),
        gender: form.gender || undefined,
        dateOfBirth: form.dob || undefined,
        alternatePhone: form.alternatePhone || undefined,
        employmentType: form.employmentType,
        roles: Object.entries(selected).map(([roleId, customProfitPercentage]) => ({
          roleId: roleId as StaffRole,
          customProfitPercentage,
        })),
      })
      if (response.data) {
        if (!response.data.id) {
          throw new Error('The staff account was created but no staff ID was returned.')
        }
        localStorage.removeItem('sfh-staff-onboarding-draft')
        setSuccess(true)
        window.setTimeout(() => onCreated(response.data as StaffMember), 900)
      }
    } catch (error) { setError(errorText(error)) } finally { setSaving(false) }
  }

  if (success) {
    return (
      <Dialog open fullWidth maxWidth="sm" onClose={onClose} aria-labelledby="staff-onboarding-success-title">
        <DialogContent>
          <Card className="staff-wizard-card staff-success-card"><CardContent>
            <div className="staff-success-icon"><Check size={34} /></div>
            <p className="staff-success-kicker">ONBOARDING COMPLETE</p>
            <h2 id="staff-onboarding-success-title">{form.firstName} {form.lastName} has been added</h2>
            <p>The staff profile and assigned roles are ready.</p>
          </CardContent></Card>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open fullWidth maxWidth="lg" className="sfh-form-dialog" onClose={onClose} aria-labelledby="staff-onboarding-title">
      <DialogTitle id="staff-onboarding-title">Staff onboarding</DialogTitle>
      <DialogContent dividers>
        <Card className="staff-wizard-card"><CardContent>
      <div className="premium-stepper-header">
        <div>
          <p>STAFF ONBOARDING</p>
          <span>Step {step + 1} of {steps.length}</span>
        </div>
        <div className="premium-progress-track"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </div>
      <nav className="premium-stepper" aria-label="Onboarding progress">
        {steps.map((item, index) => {
          const Icon = item.icon
          const completed = index < step
          const active = index === step
          return (
            <button
              type="button"
              key={item.title}
              className={`premium-step${completed ? ' completed' : ''}${active ? ' active' : ''}`}
              disabled={index > highestStep}
              onClick={() => { if (index < step || validateStep(index)) setStep(index) }}
            >
              <span className="premium-step-indicator">{completed ? <Check size={16} /> : <Icon size={16} />}</span>
              <span className="premium-step-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
            </button>
          )
        })}
      </nav>

      {validationMessage && <AutoDismissMessage message={validationMessage} onDismiss={() => setValidationMessage('')}><Alert severity="error" className="staff-inline-alert">{validationMessage}</Alert></AutoDismissMessage>}

      <div className="staff-wizard-body premium-step-content" key={step}>
        {step === 0 && (
          <section>
            <div className="premium-section-heading"><p>Personal information</p><h2>Tell us about the staff member</h2><span>Add identity and contact information.</span></div>
            <div className="staff-form-grid-mui">
              <TextField label="First name" value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} required />
              <TextField label="Last name" value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} required />
              <AppSelect label="Gender" value={form.gender} onChange={(event) => setField('gender', event.target.value)} options={[
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
                { value: 'other', label: 'Other' },
              ]} />
              <TextField label="Date of birth" type="date" value={form.dob} onChange={(event) => setField('dob', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Email address" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} />
              <TextField label="Phone number" value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
              <TextField label="Alternate phone" value={form.alternatePhone} onChange={(event) => setField('alternatePhone', event.target.value)} />
              <TextField label="Temporary password" type="password" value={form.password} onChange={(event) => setField('password', event.target.value)} required />
            </div>
          </section>
        )}
        {step === 1 && (
          <section>
            <div className="premium-section-heading"><p>Address</p><h2>Home and contact address</h2><span>Enter the staff member’s residential details.</span></div>
            <div className="staff-form-grid-mui">
              <TextField label="Door number" value={form.door} onChange={(event) => setField('door', event.target.value)} />
              <TextField label="Street" value={form.street} onChange={(event) => setField('street', event.target.value)} />
              <TextField label="Village / City" value={form.city} onChange={(event) => setField('city', event.target.value)} />
              <TextField label="District" value={form.district} onChange={(event) => setField('district', event.target.value)} />
              <TextField label="State" value={form.state} onChange={(event) => setField('state', event.target.value)} />
              <TextField label="Country" value={form.country} onChange={(event) => setField('country', event.target.value)} />
              <TextField label="PIN code" value={form.pin} onChange={(event) => setField('pin', event.target.value)} />
            </div>
          </section>
        )}
        {step === 2 && (
          <section>
            <div className="premium-section-heading"><p>Employment</p><h2>Joining and employment status</h2><span>Configure the work arrangement and start date.</span></div>
            <div className="staff-form-grid-mui">
              <TextField label="Employee ID" value={form.employeeId} onChange={(event) => setField('employeeId', event.target.value)} />
              <TextField label="Joining date" type="date" value={form.joiningDate} onChange={(event) => setField('joiningDate', event.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />
              <AppSelect label="Employment type" value={form.employmentType} onChange={(event) => setField('employmentType', event.target.value)} options={[
                { value: 'full_time', label: 'Full-time' },
                { value: 'part_time', label: 'Part-time' },
                { value: 'temporary', label: 'Temporary' },
                { value: 'contract', label: 'Contract' },
              ]} />
              <AppSelect label="Employment status" value={form.status} onChange={(event) => setField('status', event.target.value)} options={[
                { value: 'active', label: 'Active' },
                { value: 'on_leave', label: 'On leave' },
              ]} />
            </div>
          </section>
        )}
        {step === 3 && (
          <section>
            <div className="premium-section-heading"><p>Job roles</p><h2>Assign responsibilities</h2><span>Select every role this employee can perform.</span></div>
            <div className="role-selection-grid">{roleOptions.map((role) => <label className={`role-selection-card${selected[role.id] !== undefined ? ' selected' : ''}`} key={role.id}><input type="checkbox" checked={selected[role.id] !== undefined} onChange={(event) => setSelected((current) => { const next = { ...current }; if (event.target.checked) next[role.id] = Number(role.defaultProfitPercentage ?? 0); else delete next[role.id]; return next })} /><span className="role-selection-check">{selected[role.id] !== undefined && <Check size={13} />}</span><div><strong>{role.name}</strong><span>{role.id}</span></div></label>)}</div>
          </section>
        )}
        {step === 4 && (
          <section>
            <div className="premium-section-heading"><p>Profit sharing</p><h2>Configure role percentages</h2><span>Each role keeps an independent profit-share percentage.</span></div>
            {Object.keys(selected).length === 0 ? (
              <div className="staff-empty-state"><BadgeIndianRupee size={28} /><strong>No roles selected</strong><span>Return to Roles and select at least one role.</span></div>
            ) : <div className="staff-form-grid-mui">{Object.keys(selected).map((roleId) => <TextField key={roleId} label={`${roleOptions.find((role) => role.id === roleId)?.name || roleId} profit share`} type="number" slotProps={{ htmlInput: { min: 0, max: 100, step: 0.0001 } }} value={selected[roleId]} onChange={(event) => setSelected((current) => ({ ...current, [roleId]: Number(event.target.value) }))} />)}<Alert severity="info" sx={{ gridColumn: '1 / -1' }}>Multiple role shares are additive. Total: <strong>{total.toFixed(4)}%</strong></Alert></div>}
          </section>
        )}
        {step === 5 && (
          <section>
            <div className="premium-section-heading"><p>Final review</p><h2>Review before onboarding</h2><span>Confirm the details and submit the staff profile.</span></div>
            <div className="staff-review-grid"><Card variant="outlined"><CardContent><p>Employee</p><strong>{form.firstName} {form.lastName}</strong><span>{form.email || form.phone}</span></CardContent></Card><Card variant="outlined"><CardContent><p>Employment</p><strong>{form.employmentType.replace('_', '-')}</strong><span>{form.status}</span></CardContent></Card><Card variant="outlined"><CardContent><p>Assigned roles</p><strong>{Object.keys(selected).length} assigned</strong><span>{Object.entries(selected).map(([id, share]) => `${roleOptions.find((role) => role.id === id)?.name || id} ${share}%`).join(' · ')}</span></CardContent></Card></div>
          </section>
        )}
      </div>

      <div className="staff-wizard-actions">
        <Button className="wizard-secondary-action" variant="outlined" disabled={step === 0} startIcon={<ArrowLeft size={16} />} onClick={() => setStep((value) => Math.max(0, value - 1))}>Previous</Button>
        <Button className="wizard-draft-action" variant="text" startIcon={<Save size={16} />} onClick={saveDraft}>Save draft</Button>
        {step < 5
          ? <Button className="wizard-primary-action" variant="contained" endIcon={<ArrowRight size={16} />} onClick={continueStep}>Continue</Button>
          : <Button className="wizard-primary-action" variant="contained" disabled={saving || Object.keys(selected).length === 0} onClick={() => void submit()}>{saving ? 'Creating staff…' : 'Submit & onboard'}</Button>}
      </div>
        </CardContent></Card>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel onboarding</Button>
      </DialogActions>
    </Dialog>
  )
}

function RolesView({ staff, roles, reload, setNotice, setError }: {
  staff: StaffMember[]; roles: StaffJobRole[]; reload: () => Promise<void>;
  setNotice: (value: string) => void; setError: (value: string) => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<StaffJobRole | null>(null)
  const filtered = roles.filter((role) => `${role.id} ${role.name}`.toLowerCase().includes(search.toLowerCase()))
  return (
    <Card className="staff-table-card"><CardContent><div className="staff-toolbar-mui"><TextField size="small" label="Search roles" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <Table size="small" className="staff-table-mui"><TableHead><TableRow><TableCell>Role</TableCell><TableCell>Role code</TableCell><TableCell>Assigned staff</TableCell><TableCell>Suggested share</TableCell><TableCell>Status</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
        <TableBody>{filtered.map((role) => <TableRow key={role.id}><TableCell><strong>{role.name}</strong></TableCell><TableCell>{role.id}</TableCell><TableCell>{staff.filter((member) => member.role === role.id).length}</TableCell><TableCell>{Number(role.defaultProfitPercentage ?? 0).toFixed(2)}%</TableCell><TableCell><Chip size="small" color="success" label="Active" /></TableCell><TableCell align="right"><Button size="small" onClick={() => setSelected(role)}>Configure</Button></TableCell></TableRow>)}</TableBody>
      </Table>
      {selected && <RoleDialog role={selected} onClose={() => setSelected(null)} reload={reload} setNotice={setNotice} setError={setError} />}
    </CardContent></Card>
  )
}

function RoleDialog({ role, onClose, reload, setNotice, setError }: {
  role: StaffJobRole; onClose: () => void; reload: () => Promise<void>;
  setNotice: (value: string) => void; setError: (value: string) => void
}) {
  const [percentage, setPercentage] = useState(String(role.defaultProfitPercentage ?? 0))
  const [effectiveFrom, setEffectiveFrom] = useState(today())
  async function save() {
    const value = Number(percentage)
    if (!Number.isFinite(value) || value < 0 || value > 100) return setError('Percentage must be between 0 and 100.')
    try {
      await authenticatedApiRequest(`/admin/roles/${role.id}/profit-percentage`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ defaultProfitPercentage: value, effectiveFrom }) })
      setNotice('Role profit configuration saved.')
      onClose()
      await reload()
    } catch (error) { setError(errorText(error)) }
  }
  return <Dialog open fullWidth maxWidth="xs" className="sfh-form-dialog" onClose={onClose}><DialogTitle>Configure {role.name}</DialogTitle><DialogContent className="staff-dialog-grid"><TextField label="Suggested profit %" type="number" value={percentage} onChange={(event) => setPercentage(event.target.value)} /><TextField label="Effective from" type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /><Alert severity="info" sx={{ gridColumn: '1 / -1' }}>Individual employee-role percentages remain independent.</Alert></DialogContent><DialogActions><Button variant="outlined" onClick={onClose}>Cancel</Button><Button variant="contained" onClick={() => void save()}>Save</Button></DialogActions></Dialog>
}

function DailyView({ staff, roles, calculations, reload, setNotice, setError }: {
  staff: StaffMember[]; roles: StaffJobRole[]; calculations: ProfitSharingCalculation[]; reload: () => Promise<void>;
  setNotice: (value: string) => void; setError: (value: string) => void
}) {
  const [date, setDate] = useState(today())
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const selected = calculations.find((item) => item.businessDate === date)
  async function calculate() {
    try { await calculateDailyProfitSharing(date); setNotice(`Daily allocation calculated for ${date}.`); await reload() } catch (error) { setError(errorText(error)) }
  }
  return <>
    <section className="staff-filter-card"><TextField label="Business date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><Button variant="contained" onClick={() => void calculate()}>Calculate allocation</Button>{selected && <Chip color={selected.status === 'approved' ? 'success' : 'warning'} label={selected.status.replaceAll('_', ' ')} />}</section>
    <Card className="staff-table-card"><CardContent><Table size="small" className="staff-table-mui"><TableHead><TableRow><TableCell>Employee</TableCell><TableCell>Role</TableCell><TableCell>Work status</TableCell><TableCell>NET basis</TableCell><TableCell>Total allocation</TableCell><TableCell>Approval</TableCell></TableRow></TableHead><TableBody>{staff.filter((member) => member.isActive).map((member) => {
      const details = selected?.details?.filter((item) => item.staffId === member.id) ?? []
      const total = details.reduce((sum, item) => sum + Number(item.calculatedShare || 0), 0)
      return <TableRow key={member.id}><TableCell><div className="staff-person"><Avatar>{member.firstName[0]}{member.lastName[0]}</Avatar><div><strong>{member.firstName} {member.lastName}</strong><span>{member.profile?.employeeId || '—'}</span></div></div></TableCell><TableCell>{roles.find((role) => role.id === member.role)?.name || roleLabel[member.role]}</TableCell><TableCell><AppSelect size="small" value={statuses[member.id] ?? 'present'} onChange={(event) => setStatuses((current) => ({ ...current, [member.id]: event.target.value }))} options={[
        { value: 'present', label: 'Present' },
        { value: 'absent', label: 'Absent' },
        { value: 'leave', label: 'Leave' },
        { value: 'half_day', label: 'Half day' },
      ]} /></TableCell><TableCell>{selected ? money(selected.eligibleNetProfit) : '—'}</TableCell><TableCell>{selected ? money(total) : '—'}</TableCell><TableCell><Chip size="small" label={selected?.status.replaceAll('_', ' ') || 'Not submitted'} /></TableCell></TableRow>
    })}</TableBody></Table></CardContent></Card>
  </>
}

function ProfitView({ calculations, reload, setNotice, setError }: {
  calculations: ProfitSharingCalculation[]; reload: () => Promise<void>;
  setNotice: (value: string) => void; setError: (value: string) => void
}) {
  const [date, setDate] = useState(today())
  const [status, setStatus] = useState('all')
  const [details, setDetails] = useState<ProfitSharingCalculation | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')
  const filtered = calculations.filter((item) => (!date || item.businessDate === date) && (status === 'all' || item.status === status))
  async function approve(id: string) { try { await approveProfitSharing(id); setNotice('Allocation approved.'); await reload() } catch (error) { setError(errorText(error)) } }
  async function reject() { if (!rejectId) return; try { await rejectProfitSharing(rejectId, remarks); setRejectId(null); setNotice('Allocation rejected.'); await reload() } catch (error) { setError(errorText(error)) } }
  return <>
    <section className="staff-filter-card"><TextField label="Business date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><AppSelect label="Status" value={status} onChange={(event) => setStatus(event.target.value)} options={[
      { value: 'all', label: 'All statuses' },
      { value: 'pending_approval', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ]} /></section>
    <Card className="staff-table-card"><CardContent><Table size="small" className="staff-table-mui"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>NET profit</TableCell><TableCell>Allocation</TableCell><TableCell>Staff share</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{filtered.map((item) => <TableRow key={item.id}><TableCell>{item.businessDate}</TableCell><TableCell>{money(item.eligibleNetProfit)}</TableCell><TableCell>{Number(item.totalAllocationPercentage).toFixed(4)}%</TableCell><TableCell>{money(item.totalProfitShare)}</TableCell><TableCell><Chip size="small" color={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'error' : 'warning'} label={item.status.replaceAll('_', ' ')} /></TableCell><TableCell align="right"><Button size="small" onClick={() => setDetails(item)}>Details</Button>{item.status === 'pending_approval' && <><Button size="small" color="success" onClick={() => void approve(item.id)}>Approve</Button><Button size="small" color="error" onClick={() => setRejectId(item.id)}>Reject</Button></>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    <Dialog open={Boolean(details)} fullWidth maxWidth="sm" onClose={() => setDetails(null)}><DialogTitle>Calculation details</DialogTitle><DialogContent>{details && <><div className="profit-breakdown"><div><span>NET profit</span><strong>{money(details.eligibleNetProfit)}</strong></div><div><span>Staff share</span><strong>{money(details.totalProfitShare)}</strong></div></div>{details.details?.map((row) => <div className="profit-detail-row" key={row.id}><span>{row.roleId}</span><strong>{Number(row.appliedPercentage).toFixed(4)}%</strong><strong>{money(row.calculatedShare)}</strong></div>)}</>}</DialogContent><DialogActions><Button onClick={() => setDetails(null)}>Close</Button></DialogActions></Dialog>
    <Dialog open={Boolean(rejectId)} maxWidth="xs" fullWidth className="sfh-form-dialog" onClose={() => setRejectId(null)}><DialogTitle>Reject allocation</DialogTitle><DialogContent><TextField fullWidth multiline minRows={3} label="Reason" value={remarks} onChange={(event) => setRemarks(event.target.value)} /></DialogContent><DialogActions><Button variant="outlined" onClick={() => setRejectId(null)}>Cancel</Button><Button variant="contained" color="error" disabled={!remarks.trim()} onClick={() => void reject()}>Reject</Button></DialogActions></Dialog>
  </>
}

function PaymentsView({ staff, calculations, setNotice, setError }: {
  staff: StaffMember[]; calculations: ProfitSharingCalculation[];
  setNotice: (value: string) => void; setError: (value: string) => void
}) {
  const approved = calculations.filter((item) => item.status === 'approved')
  const rows = approved.flatMap((item) => (item.details ?? []).map((detail) => ({ item, detail })))
  const [open, setOpen] = useState(false)
  const [calculationId, setCalculationId] = useState('')
  const [detailId, setDetailId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'upi' | 'bank_transfer'>('upi')
  const [date, setDate] = useState(today())
  const calculation = approved.find((item) => item.id === calculationId)
  const detail = calculation?.details?.find((item) => item.id === detailId)

  async function save() {
    const value = Number(amount)
    if (!detailId || !detail || !Number.isFinite(value) || value <= 0) return setError('Select a payable allocation and enter a valid amount.')
    if (value > Number(detail.calculatedShare)) return setError('Payment cannot exceed the approved payable balance.')
    try {
      await authenticatedApiRequest('/admin/profit-sharing/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentDate: date, paymentMethod: method, allocations: [{ calculationDetailId: detailId, amount: value }] }) })
      setNotice('Staff payment recorded.')
      setOpen(false)
    } catch (error) { setError(errorText(error)) }
  }

  return <>
    <section className="staff-payment-summary"><Card><CardContent><span>Approved payable</span><strong>{money(approved.reduce((sum, item) => sum + Number(item.totalProfitShare), 0))}</strong></CardContent></Card><Card><CardContent><span>Approved allocations</span><strong>{approved.length}</strong></CardContent></Card><Card><CardContent><span>Active staff</span><strong>{staff.filter((member) => member.isActive).length}</strong></CardContent></Card><Button variant="contained" onClick={() => setOpen(true)}><WalletCards size={17} /> Record payment</Button></section>
    <Card className="staff-table-card"><CardContent><Table size="small" className="staff-table-mui"><TableHead><TableRow><TableCell>Period</TableCell><TableCell>Employee</TableCell><TableCell>Approved profit</TableCell><TableCell>Status</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead><TableBody>{rows.map(({ item, detail }) => {
      const member = staff.find((staffMember) => staffMember.id === detail.staffId)
      return <TableRow key={detail.id}><TableCell>{item.businessDate}</TableCell><TableCell>{member ? `${member.firstName} ${member.lastName}` : detail.staffId}</TableCell><TableCell>{money(detail.calculatedShare)}</TableCell><TableCell><Chip size="small" color="warning" label="Pending payment" /></TableCell><TableCell align="right"><Button size="small" onClick={() => { setCalculationId(item.id); setDetailId(detail.id); setAmount(String(detail.calculatedShare)); setOpen(true) }}>Pay</Button></TableCell></TableRow>
    })}</TableBody></Table></CardContent></Card>
    <Dialog open={open} fullWidth maxWidth="sm" className="sfh-form-dialog" onClose={() => setOpen(false)}><DialogTitle>Record staff payment</DialogTitle><DialogContent className="staff-dialog-grid"><AppSelect label="Approved allocation" value={calculationId} onChange={(event) => { setCalculationId(event.target.value); setDetailId('') }} displayEmpty options={[
      { value: '', label: 'Select an approved allocation', disabled: true },
      ...approved.map((item) => ({ value: item.id, label: `${item.businessDate} — ${money(item.totalProfitShare)}` })),
    ]} /><AppSelect label="Employee payable" value={detailId} onChange={(event) => setDetailId(event.target.value)} displayEmpty options={[
      { value: '', label: 'Select an employee payable', disabled: true },
      ...(calculation?.details ?? []).map((item) => ({
        value: item.id,
        label: `${staff.find((member) => member.id === item.staffId)?.firstName || item.staffId} — ${money(item.calculatedShare)}`,
      })),
    ]} /><TextField label="Payment date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /><AppSelect label="Method" value={method} onChange={(event) => setMethod(event.target.value as typeof method)} options={[
      { value: 'cash', label: 'Cash' },
      { value: 'upi', label: 'UPI' },
      { value: 'bank_transfer', label: 'Bank transfer' },
    ]} /><TextField label="Amount" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></DialogContent><DialogActions><Button variant="outlined" onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => void save()}>Record payment</Button></DialogActions></Dialog>
  </>
}

function ReportsView({ staff, calculations }: { staff: StaffMember[]; calculations: ProfitSharingCalculation[] }) {
  const [type, setType] = useState('profit')
  function exportReport() {
    const rows = type === 'profit'
      ? [['Date', 'NET profit', 'Staff share', 'Status'], ...calculations.map((item) => [item.businessDate, item.eligibleNetProfit, item.totalProfitShare, item.status])]
      : [['Employee ID', 'Name', 'Role', 'Status'], ...staff.map((member) => [member.profile?.employeeId || '', `${member.firstName} ${member.lastName}`, roleLabel[member.role], member.profile?.employmentStatus || 'active'])]
    downloadCsv(rows, `staff-${type}-report.csv`)
  }
  return <>
    <section className="staff-filter-card"><AppSelect label="Report" value={type} onChange={(event) => setType(event.target.value)} options={[
      { value: 'profit', label: 'Staff profit report' },
      { value: 'directory', label: 'Staff directory' },
    ]} /><Button variant="contained" startIcon={<Download size={16} />} onClick={exportReport}>Export CSV</Button></section>
    <section className="staff-report-grid"><Card><CardContent><span>Approved profit</span><strong>{money(calculations.filter((item) => item.status === 'approved').reduce((sum, item) => sum + Number(item.totalProfitShare), 0))}</strong></CardContent></Card><Card><CardContent><span>Pending approvals</span><strong>{calculations.filter((item) => item.status === 'pending_approval').length}</strong></CardContent></Card><Card><CardContent><span>Active staff</span><strong>{staff.filter((member) => member.isActive).length}</strong></CardContent></Card></section>
  </>
}
