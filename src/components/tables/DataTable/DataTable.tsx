import type { ReactNode } from 'react'

export type DataColumn<Row> = {
  key: string
  header: string
  render: (row: Row) => ReactNode
}

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  emptyMessage = 'No records to display.',
}: {
  columns: DataColumn<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string
  emptyMessage?: string
}) {
  return (
    <div className="sfh-table-wrap">
      <table className="sfh-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length
            ? rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}
              </tr>
            ))
            : <tr><td colSpan={columns.length}>{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
