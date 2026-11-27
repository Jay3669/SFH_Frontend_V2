import { apiEndpoints } from '../../services/api/apiEndpoints'
import { authenticatedApiRequest } from '../../services/api/apiClient'
export { getActiveBranchId, setActiveBranchId } from '../../services/storage/branchStorage'

export type Branch = {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  email: string | null
  createdAt: string
  updatedAt: string
}

export type BranchInput = Pick<Branch, 'name' | 'code' | 'address' | 'phone' | 'email'>

type BranchResponse<T> = { data?: T }

export function getBranches() {
  return authenticatedApiRequest<BranchResponse<Branch[]>>(apiEndpoints.branches)
}

export function createBranch(input: BranchInput) {
  return authenticatedApiRequest<BranchResponse<Branch>>(apiEndpoints.branches, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function updateBranch(id: string, input: Partial<BranchInput>) {
  return authenticatedApiRequest<BranchResponse<Branch>>(`${apiEndpoints.branches}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function deleteBranch(id: string) {
  return authenticatedApiRequest<BranchResponse<{ id: string; deleted: boolean }>>(
    `${apiEndpoints.branches}/${id}`,
    { method: 'DELETE' },
  )
}
