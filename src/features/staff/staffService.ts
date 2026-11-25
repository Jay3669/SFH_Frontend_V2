import { apiEndpoints } from '../../services/api/apiEndpoints'
import { authenticatedApiRequest } from '../../services/api/apiClient'

export type StaffRole = 'manager' | 'cashier' | 'employee'
export type StaffEmploymentStatus = 'active' | 'on_leave' | 'inactive'

export type StaffProfile = {
  id?: string
  address?: string | null
  department?: string | null
  designation?: string | null
  joiningDate?: string | null
  salary?: number | string | null
  employmentStatus?: StaffEmploymentStatus
  profileImage?: string | null
  employeeId?: string | null
  emergencyContact?: Record<string, string>
  gender?: string | null
  dateOfBirth?: string | null
  alternatePhone?: string | null
  employmentType?: string | null
}

export type StaffMember = {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phoneNumber?: string | null
  role: StaffRole
  roles?: StaffRoleAssignment[]
  roleAssignments?: StaffRoleAssignment[]
  status: 'active' | 'inactive' | 'blocked'
  isActive: boolean
  createdAt: string
  updatedAt: string
  profile?: StaffProfile | null
}

export type StaffInput = {
  firstName: string
  lastName: string
  email?: string
  phoneNumber?: string
  password: string
  role: StaffRole
  address?: string
  department?: string
  designation?: string
  joiningDate?: string
  salary?: number
  employmentStatus?: StaffEmploymentStatus
  employeeId?: string
  emergencyContact?: Record<string, string>
  gender?: string
  dateOfBirth?: string
  alternatePhone?: string
  employmentType?: string
  roles?: Array<{ roleId: StaffRole; customProfitPercentage: number }>
}

export type StaffUpdateInput = {
  firstName?: string
  lastName?: string
  role?: StaffRole
  address?: string
  department?: string
  designation?: string
  joiningDate?: string
  salary?: number
  employmentStatus?: StaffEmploymentStatus
  profileImage?: string
  employeeId?: string
  emergencyContact?: Record<string, string>
  gender?: string
  dateOfBirth?: string
  alternatePhone?: string
  employmentType?: string
}

export type StaffRoleAssignment = {
  id: string
  staffId: string
  roleId: string
  customProfitPercentage?: number | string | null
  effectiveFrom: string
  effectiveTo?: string | null
  status: 'active' | 'inactive'
  role?: { id: string; name: string }
}

export type StaffJobRole = {
  id: string
  name: string
  defaultProfitPercentage?: number | string
}

type ApiResponse<T> = { data?: T }

export function getStaff() {
  return authenticatedApiRequest<ApiResponse<StaffMember[]>>(apiEndpoints.staff)
}

export function createStaff(input: StaffInput) {
  return authenticatedApiRequest<ApiResponse<StaffMember>>(apiEndpoints.staff, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function updateStaff(id: string, input: StaffUpdateInput) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.staff}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function deactivateStaff(id: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.staff}/${id}`, {
    method: 'DELETE',
  })
}

export function getStaffRoles() {
  return authenticatedApiRequest<ApiResponse<StaffJobRole[]>>(apiEndpoints.profitSharing.roles)
}

export function getStaffRoleAssignments(staffId: string) {
  return authenticatedApiRequest<ApiResponse<StaffRoleAssignment[]>>(`/admin/staff/${staffId}/roles`)
}

export function assignStaffRole(
  staffId: string,
  input: { roleId: string; customProfitPercentage: number; effectiveFrom: string },
) {
  return authenticatedApiRequest<ApiResponse<StaffRoleAssignment>>(`/admin/staff/${staffId}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function updateStaffRole(
  staffId: string,
  assignmentId: string,
  input: { customProfitPercentage?: number | null; effectiveFrom?: string; effectiveTo?: string | null; status?: 'active' | 'inactive' },
) {
  return authenticatedApiRequest<ApiResponse<StaffRoleAssignment>>(
    `/admin/staff/${staffId}/roles/${assignmentId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
}

export function removeStaffRole(staffId: string, assignmentId: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(
    `/admin/staff/${staffId}/roles/${assignmentId}`,
    { method: 'DELETE' },
  )
}
