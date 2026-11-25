import { Pagination } from '@mui/material'

export function TablePagination({
  page,
  pageCount,
  onPageChange,
  alwaysShow = false,
  label,
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  alwaysShow?: boolean
  label?: string
}) {
  if (pageCount <= 1 && !alwaysShow) return null

  return (
    <div className="sfh-pagination" role="group" aria-label="Table pagination">
      <span className="sfh-pagination-label">
        {label ? `${label} · ` : ''}Page {page} of {Math.max(pageCount, 1)}
      </span>
      <Pagination
        count={Math.max(pageCount, 1)}
        page={Math.min(page, Math.max(pageCount, 1))}
        onChange={(_, nextPage) => onPageChange(nextPage)}
        shape="rounded"
        size="small"
        showFirstButton
        showLastButton
      />
    </div>
  )
}
