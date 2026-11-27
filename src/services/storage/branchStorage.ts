export const activeBranchStorageKey = 'sfh_active_branch_id'

export function getActiveBranchId() {
  return typeof window === 'undefined'
    ? null
    : window.localStorage.getItem(activeBranchStorageKey)
}

export function setActiveBranchId(branchId: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(activeBranchStorageKey, branchId)
  }
}
