import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AppTooltip } from '../../components/common/Tooltip/AppTooltip'
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog'
import { Icon } from '../../components/common/Icon/Icon'
import { AdminLayout } from '../../layouts/AdminLayout'
import type { AuthUser } from '../../types/auth.types'
import {
  archiveStockItem,
  createStockCategory,
  createStockItem,
  deleteStockCategory,
  getStockCategories,
  getStockItems,
  getStockMovements,
  getStockSummary,
  recordStockMovement,
  restoreStockItem,
  updateStockCategory,
  updateStockItem,
} from './stockService'
import type {
  StockCategory,
  StockCategoryInput,
  StockItem,
  StockItemInput,
  StockMovement,
  StockMovementInput,
  StockSummary,
} from './stock.types'
import { capitalizeFirstLetter } from '../../utils/capitalizeFirstLetter'
import { AppTextField } from '../../components/common/AppTextField'
import { AppSelect } from '../../components/common/AppSelect'
import { AppButton } from '../../components/common/AppButton'
import { TablePagination } from '../../components/tables/TablePagination/TablePagination'
import noCategoryImage from '../../assets/images/no-category-image.png'
import { SlidersHorizontal } from 'lucide-react'
import './stock.css'

type Tab = 'items' | 'activity' | 'categories'
type ItemFilter = 'active' | 'low' | 'out' | 'inactive'
type DialogState =
  | { type: 'item'; item?: StockItem }
  | { type: 'movement'; item: StockItem }
  | { type: 'category'; category?: StockCategory }
  | null
type ConfirmationState = {
  title: string
  message: string
  confirmLabel: string
  icon: 'delete' | 'deactivate'
  onConfirm: () => void
} | null

const PAGE_SIZE = 10
const asNumber = (value: number | string) => Number(value)
const quantityText = (value: number | string, unit: string) =>
  `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(asNumber(value))} ${unit}`
const moneyText = (value: number | string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
    .format(asNumber(value))
const dateText = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'The stock request could not be completed.'

export function StockManagementPage({
  user,
  onLogout,
}: {
  user: AuthUser
  onLogout: () => void
}) {
  const [tab, setTab] = useState<Tab>('items')
  const [filter, setFilter] = useState<ItemFilter>('active')
  const [searchText, setSearchText] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [items, setItems] = useState<StockItem[]>([])
  const [categories, setCategories] = useState<StockCategory[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [summary, setSummary] = useState<StockSummary | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null)

  function beginLoad() {
    setError('')
    setIsLoading(true)
  }

  function refreshData() {
    beginLoad()
    setRefreshKey((key) => key + 1)
  }

  useEffect(() => {
    let active = true
    const listRequest = tab === 'items'
      ? getStockItems({ q: search, status: filter, page, limit: PAGE_SIZE })
      : tab === 'activity'
        ? getStockMovements(page, PAGE_SIZE)
        : Promise.resolve(undefined)
    const categoriesRequest = tab === 'activity' ? Promise.resolve(undefined) : getStockCategories()

    Promise.all([getStockSummary(), listRequest, categoriesRequest])
      .then(([summaryResponse, listResponse, categoriesResponse]) => {
        if (!active) return
        setSummary(summaryResponse.data ?? null)
        if (categoriesResponse) {
          setCategories(Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [])
        }
        if (tab === 'items' && listResponse) {
          setItems(Array.isArray(listResponse.data) ? listResponse.data as StockItem[] : [])
        } else if (tab === 'activity' && listResponse) {
          setMovements(Array.isArray(listResponse.data) ? listResponse.data as StockMovement[] : [])
        }
        setTotalPages(Math.max(1, listResponse?.pagination?.totalPages ?? 1))
      })
      .catch((requestError: unknown) => {
        if (active) setError(errorText(requestError))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [filter, page, refreshKey, search, tab])

  async function saveItem(input: StockItemInput, item?: StockItem) {
    if (item) await updateStockItem(item.id, input)
    else await createStockItem(input)
    setDialog(null)
    setNotice(item ? 'Stock item updated.' : 'Stock item created.')
    refreshData()
  }

  async function saveCategory(input: StockCategoryInput, category?: StockCategory) {
    if (category) await updateStockCategory(category.id, input)
    else await createStockCategory(input)
    setDialog(null)
    setNotice(category ? 'Stock category updated.' : 'Stock category created.')
    refreshData()
  }

  async function saveMovement(item: StockItem, input: StockMovementInput) {
    await recordStockMovement(item.id, input)
    setDialog(null)
    setNotice('Stock movement recorded.')
    refreshData()
  }

  function handleArchive(item: StockItem) {
    setConfirmation({
      title: 'Archive stock item?',
      message: `Archive ${item.name}? Its movement history will be retained.`,
      confirmLabel: 'Archive item',
      icon: 'deactivate',
      onConfirm: () => {
        setConfirmation(null)
        void archiveItem(item)
      },
    })
  }

  async function archiveItem(item: StockItem) {
    beginLoad()
    try {
      await archiveStockItem(item.id)
      setNotice(`${item.name} archived.`)
      refreshData()
    } catch (requestError) {
      setError(errorText(requestError))
      setIsLoading(false)
    }
  }

  async function handleRestore(item: StockItem) {
    beginLoad()
    try {
      await restoreStockItem(item.id)
      setNotice(`${item.name} restored.`)
      refreshData()
    } catch (requestError) {
      setError(errorText(requestError))
      setIsLoading(false)
    }
  }

  function handleDeleteCategory(category: StockCategory) {
    setConfirmation({
      title: 'Delete stock category?',
      message: `Delete ${category.name}? Categories with assigned items cannot be deleted.`,
      confirmLabel: 'Delete category',
      icon: 'delete',
      onConfirm: () => {
        setConfirmation(null)
        void deleteCategory(category)
      },
    })
  }

  async function deleteCategory(category: StockCategory) {
    beginLoad()
    try {
      await deleteStockCategory(category.id)
      setNotice(`${category.name} deleted.`)
      refreshData()
    } catch (requestError) {
      setError(errorText(requestError))
      setIsLoading(false)
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchText.trim())
    refreshData()
  }

  function resetItemFilters() {
    setSearchText('')
    setSearch('')
    setFilter('active')
    setPage(1)
    refreshData()
  }

  return (
    <AdminLayout
      user={user}
      roleLabel="Administrator"
      sectionTitle="Stock management"
      onLogout={onLogout}
    >
      <main className="stock-page">
        <div className="stock-page-heading">
          <div>
            <p className="eyebrow">INVENTORY CONTROL</p>
            <h1>Stock management</h1>
            <p className="stock-subtitle">Track ingredients and supplies, record every movement, and stay ahead of low stock.</p>
          </div>
          {tab === 'categories' ? (
            <button className="sfh-button" type="button" onClick={() => setDialog({ type: 'category' })}>
              <Icon name="add" size={16} /> Add category
            </button>
          ) : tab === 'items' ? (
            <button className="sfh-button" type="button" onClick={() => setDialog({ type: 'item' })}>
              <Icon name="add" size={16} /> Add stock item
            </button>
          ) : null}
        </div>

        <section className="stock-metrics" aria-label="Stock summary">
          <MetricCard label="Total items" value={summary?.totalItems ?? '—'} icon="▦" tone="gold" />
          <MetricCard label="Low stock" value={summary?.lowStock ?? '—'} icon="↘" tone="orange" />
          <MetricCard label="Out of stock" value={summary?.outOfStock ?? '—'} icon="!" tone="red" />
          <MetricCard label="Used today" value={summary?.dailyUsedItems ?? '—'} icon="↗" tone="blue" />
          <MetricCard label="Stock value" value={summary ? moneyText(summary.stockValue) : '—'} icon="₹" tone="green" />
        </section>
        {summary && summary.dailyUsage.length > 0 && (
          <section className="stock-daily-usage" aria-label="Today's stock usage">
            <div>
              <strong>Today's usage</strong>
              <span>Distinct items issued today</span>
            </div>
            <ul>
              {summary.dailyUsage.map((usage) => (
                <li key={usage.itemId}>
                  <span>{usage.name}</span>
                  <strong>{quantityText(usage.quantity, usage.unit)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        {notice && (
          <div className="stock-notice" role="status">
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" size={16} /></button>
          </div>
        )}
        {error && (
          <div className="stock-error" role="alert">
            <span>{error}</span>
            <button className="sfh-button sfh-button-secondary" type="button" onClick={refreshData}>
              Retry
            </button>
          </div>
        )}

        <section className="stock-panel">
          <div className="stock-panel-top">
            <div className="sfh-tabs" role="tablist" aria-label="Stock views">
              <button
                className="sfh-tab"
                type="button"
                role="tab"
                aria-selected={tab === 'items'}
                onClick={() => { setTab('items'); setPage(1); refreshData() }}
              >
                Items
              </button>
              <button
                className="sfh-tab"
                type="button"
                role="tab"
                aria-selected={tab === 'activity'}
                onClick={() => { setTab('activity'); setPage(1); refreshData() }}
              >
                Movement history
              </button>
              <button
                className="sfh-tab"
                type="button"
                role="tab"
                aria-selected={tab === 'categories'}
                onClick={() => { setTab('categories'); setPage(1); refreshData() }}
              >
                Categories
              </button>
            </div>
            {tab === 'items' && (
              <form className="stock-filters" onSubmit={submitSearch}>
                <AppTextField
                  aria-label="Search stock items"
                  placeholder="Search name, SKU or category"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  slotProps={{ input: { startAdornment: <span aria-hidden="true" style={{ paddingRight: 8, color: '#77766F' }}>⌕</span> } }}
                />
                <AppSelect
                  aria-label="Filter stock items"
                  value={filter}
                  onChange={(event) => {
                    beginLoad()
                    setFilter(event.target.value as ItemFilter)
                    setPage(1)
                  }}
                  options={[
                    { value: 'active', label: 'All active' },
                    { value: 'low', label: 'Low stock' },
                    { value: 'out', label: 'Out of stock' },
                    { value: 'inactive', label: 'Archived' },
                  ]}
                />
                <AppButton variant="contained" type="submit">Search</AppButton>
                <AppTooltip title="Reset filters">
                  <AppButton
                    variant="outlined"
                    type="button"
                    aria-label="Reset filters"
                    onClick={resetItemFilters}
                  >
                    <Icon name="reset" size={14} />
                  </AppButton>
                </AppTooltip>
              </form>
            )}
          </div>

          {isLoading ? (
            <div className="stock-empty" role="status"><span className="stock-spinner" /> Loading stock data…</div>
          ) : tab === 'items' ? (
            <ItemsTable
              items={items}
              archived={filter === 'inactive'}
              onEdit={(item) => setDialog({ type: 'item', item })}
              onMovement={(item) => setDialog({ type: 'movement', item })}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          ) : tab === 'activity' ? (
            <MovementTable movements={movements} />
          ) : (
            <CategoriesTable
              categories={categories}
              onEdit={(category) => setDialog({ type: 'category', category })}
              onDelete={handleDeleteCategory}
            />
          )}

          {!isLoading && tab !== 'categories' && (tab === 'items' ? items.length : movements.length) > 0 && (
            <TablePagination
              page={page}
              pageCount={totalPages}
              alwaysShow
              onPageChange={(nextPage) => {
                beginLoad()
                setPage(nextPage)
              }}
            />
          )}
        </section>
      </main>

      {dialog?.type === 'item' && (
        <ItemDialog
          item={dialog.item}
          categories={categories}
          onClose={() => setDialog(null)}
          onSave={saveItem}
        />
      )}
      {dialog?.type === 'movement' && (
        <MovementDialog
          item={dialog.item}
          onClose={() => setDialog(null)}
          onSave={saveMovement}
        />
      )}
      {dialog?.type === 'category' && (
        <CategoryDialog
          category={dialog.category}
          onClose={() => setDialog(null)}
          onSave={saveCategory}
        />
      )}
      {confirmation && <ConfirmDialog
        title={confirmation.title}
        message={confirmation.message}
        confirmLabel={confirmation.confirmLabel}
        icon={confirmation.icon}
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmation.onConfirm}
      />}
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
  icon: string
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

function ItemsTable({
  items,
  archived,
  onEdit,
  onMovement,
  onArchive,
  onRestore,
}: {
  items: StockItem[]
  archived: boolean
  onEdit: (item: StockItem) => void
  onMovement: (item: StockItem) => void
  onArchive: (item: StockItem) => void
  onRestore: (item: StockItem) => void
}) {
  if (items.length === 0) {
    return (
      <div className="stock-empty">
        <span className="stock-empty-icon">◈</span>
        <strong>No stock items found</strong>
        <span>{archived ? 'Archived items will appear here.' : 'Add an item or adjust the search and filters.'}</span>
      </div>
    )
  }

  return (
    <div className="sfh-table-wrap stock-table-wrap">
      <table className="sfh-table stock-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Item code</th>
            <th>Stock item</th>
            <th>Category</th>
            <th>Order</th>
            <th>Expiry date</th>
            <th>On hand</th>
            <th>Reorder at</th>
            <th>Weighted avg cost</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const quantity = asNumber(item.quantity)
            const reorderLevel = asNumber(item.reorderLevel)
            const status = quantity <= 0
              ? 'out'
              : reorderLevel > 0 && quantity <= reorderLevel
                ? 'low'
                : 'healthy'
            return (
              <tr key={item.id}>
                <td>
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={`${item.name} stock item`} onError={(event) => { event.currentTarget.hidden = true }} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                    : '—'}
                </td>
                <td>{item.itemCode}</td>
                <td>
                  <span className="stock-item-name">{item.name}</span>
                  <small className="stock-item-sku">{item.sku || 'No SKU'} · {item.unit}</small>
                </td>
                <td>{item.category}</td>
                <td>{item.displayOrder}</td>
                <td>{item.expiryDate || '—'}</td>
                <td className="stock-quantity">{quantityText(item.quantity, item.unit)}</td>
                <td>{quantityText(item.reorderLevel, item.unit)}</td>
                <td>{moneyText(item.unitCost)}</td>
                <td><span className={`stock-status stock-status-${status}`}>{status === 'healthy' ? 'In stock' : status === 'low' ? 'Low stock' : 'Out of stock'}</span></td>
                <td>
                  <div className="stock-row-actions">
                    {archived ? (
                      <AppTooltip title={`Restore ${item.name}`}>
                        <button type="button" onClick={() => onRestore(item)}>
                          <Icon name="activate" size={14} />
                        </button>
                      </AppTooltip>
                    ) : (
                      <>
                        <AppTooltip title={`Adjust ${item.name}`}>
                          <button
                            type="button"
                            aria-label={`Adjust ${item.name}`}
                            onClick={() => onMovement(item)}
                          >
                            <SlidersHorizontal size={14} />
                          </button>
                        </AppTooltip>
                        <AppTooltip title={`Edit ${item.name}`}>
                          <button type="button" onClick={() => onEdit(item)}>
                            <Icon name="edit" size={14} />
                          </button>
                        </AppTooltip>
                        <AppTooltip title={`Archive ${item.name}`}>
                          <button className="stock-archive-action" type="button" onClick={() => onArchive(item)}>
                            <Icon name="deactivate" size={14} />
                          </button>
                        </AppTooltip>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MovementTable({ movements }: { movements: StockMovement[] }) {
  if (movements.length === 0) {
    return (
      <div className="stock-empty">
        <span className="stock-empty-icon">↔</span>
        <strong>No movement history yet</strong>
        <span>Receiving, issuing, and counting stock will appear here.</span>
      </div>
    )
  }
  return (
    <div className="sfh-table-wrap stock-table-wrap">
      <table className="sfh-table stock-table">
        <thead>
          <tr><th>Date</th><th>Item</th><th>Movement</th><th>Change</th><th>Purchase unit cost</th><th>Balance</th><th>Reason</th></tr>
        </thead>
        <tbody>
          {movements.map((movement) => {
            const change = asNumber(movement.change)
            const direction = movement.type === 'count' ? 'Count' : movement.type === 'in' ? 'Received' : 'Issued'
            return (
              <tr key={movement.id}>
                <td>{dateText(movement.createdAt)}</td>
                <td>
                  <span className="stock-item-name">{movement.item?.name || 'Archived item'}</span>
                  <small className="stock-item-sku">{movement.item?.sku || movement.unit}</small>
                </td>
                <td><span className={`stock-status stock-status-${movement.type}`}>{direction}</span></td>
                <td className={change < 0 ? 'stock-change-negative' : 'stock-change-positive'}>
                  {change > 0 ? '+' : ''}{quantityText(change, movement.unit)}
                </td>
                <td>{movement.unitCost === null ? '—' : moneyText(movement.unitCost)}</td>
                <td>{quantityText(movement.afterQuantity, movement.unit)}</td>
                <td>{movement.reason}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CategoriesTable({
  categories,
  onEdit,
  onDelete,
}: {
  categories: StockCategory[]
  onEdit: (category: StockCategory) => void
  onDelete: (category: StockCategory) => void
}) {
  if (categories.length === 0) {
    return (
      <div className="stock-empty">
        <span className="stock-empty-icon">◈</span>
        <strong>No stock categories yet</strong>
        <span>Create a category before adding stock items.</span>
      </div>
    )
  }
  return (
    <div className="sfh-table-wrap stock-table-wrap">
      <table className="sfh-table stock-table">
        <thead><tr><th>Order</th><th>Image</th><th>Code</th><th>Category</th><th>Description</th><th>Items</th><th>Actions</th></tr></thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id}>
              <td>{category.displayOrder}</td>
              <td>
                <img
                  src={category.imageUrl || noCategoryImage}
                  alt={category.imageUrl ? `${category.name} category` : 'No category image available'}
                  onError={(event) => {
                    event.currentTarget.onerror = null
                    event.currentTarget.src = noCategoryImage
                  }}
                  style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                />
              </td>
              <td>{category.categoryCode}</td>
              <td><span className="stock-item-name">{category.name}</span></td>
              <td>{category.description || '—'}</td>
              <td>{category.itemCount}</td>
              <td>
                <div className="stock-row-actions">
                  <AppTooltip title={`Edit ${category.name}`}>
                    <button type="button" onClick={() => onEdit(category)}>
                      <Icon name="edit" size={14} />
                    </button>
                  </AppTooltip>
                  <AppTooltip title={`Delete ${category.name}`}>
                    <button className="stock-archive-action" type="button" onClick={() => onDelete(category)}>
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

function Modal({
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
      <section className="stock-modal" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title">
        <div className="stock-modal-heading">
          <div>
            <h2 id="stock-modal-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" className="stock-modal-close" aria-label="Close dialog" onClick={onClose}><Icon name="close" size={17} /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function ItemDialog({
  item,
  categories,
  onClose,
  onSave,
}: {
  item?: StockItem
  categories: StockCategory[]
  onClose: () => void
  onSave: (input: StockItemInput, item?: StockItem) => Promise<void>
}) {
  const [name, setName] = useState(capitalizeFirstLetter(item?.name ?? ''))
  const [sku, setSku] = useState(capitalizeFirstLetter(item?.sku ?? ''))
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? '')
  const [expiryDate, setExpiryDate] = useState(item?.expiryDate ?? '')
  const [displayOrder, setDisplayOrder] = useState(item?.displayOrder ?? 0)
  const [categoryId, setCategoryId] = useState(
    item?.categoryId ?? categories.find((category) => category.name === item?.category)?.id ?? '',
  )
  const [unit, setUnit] = useState(item?.unit ?? 'kg')
  const [reorderLevel, setReorderLevel] = useState(item ? String(item.reorderLevel) : '0')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      await onSave({
        name: name.trim(),
        sku: sku.trim() || null,
        imageUrl: imageUrl.trim() || null,
        expiryDate: expiryDate || null,
        displayOrder,
        categoryId,
        unit: unit.trim(),
        reorderLevel: Number(reorderLevel),
      }, item)
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      title={item ? 'Edit stock item' : 'Add stock item'}
      description="Item code is generated automatically. Set the item details and low-stock threshold."
      onClose={onClose}
    >
      <form className="stock-form" onSubmit={submit}>
        <div className="stock-form-grid">
          <FormField label="Item name">
            <AppTextField placeholder="Item name" required value={name} onChange={(event) => setName(capitalizeFirstLetter(event.target.value))} slotProps={{ htmlInput: { maxLength: 120 } }} />
          </FormField>
          <FormField label="SKU (optional)">
            <AppTextField placeholder="SKU (optional)" value={sku} onChange={(event) => setSku(capitalizeFirstLetter(event.target.value))} slotProps={{ htmlInput: { maxLength: 64 } }} />
          </FormField>
          <FormField label="Image URL (optional)">
            <AppTextField placeholder="https://example.com/item.png" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} slotProps={{ htmlInput: { maxLength: 2048 } }} />
          </FormField>
          <FormField label="Expiry date (optional)">
            <AppTextField type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
          </FormField>
          <FormField label="Category">
            <AppSelect
              placeholder="Category"
              displayEmpty
              required
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              options={[
                { value: '', label: 'Select a category', disabled: true },
                ...categories.map((category) => ({ value: category.id, label: category.name })),
              ]}
            />
          </FormField>
          <FormField label="Unit">
            <AppTextField placeholder="Unit" required value={unit} onChange={(event) => setUnit(event.target.value)} slotProps={{ htmlInput: { maxLength: 24 } }} />
          </FormField>
          <FormField label="Low-stock threshold">
            <AppTextField placeholder="Low-stock threshold" type="number" slotProps={{ htmlInput: { min: 0, step: 0.001 } }} required value={reorderLevel} onChange={(event) => setReorderLevel(event.target.value)} />
          </FormField>
          <FormField label="Display order">
            <AppTextField type="number" slotProps={{ htmlInput: { min: 0, max: 100000, step: 1 } }} required value={displayOrder} onChange={(event) => setDisplayOrder(Number(event.target.value))} />
          </FormField>
        </div>
        {categories.length === 0 && (
          <p className="stock-form-error">Create a category before adding stock items.</p>
        )}
        {error && <p className="stock-form-error" role="alert">{error}</p>}
        <div className="stock-modal-actions">
          <button className="sfh-button sfh-button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="sfh-button" type="submit" disabled={isSaving || categories.length === 0}>
            {isSaving ? 'Saving…' : item ? 'Save changes' : 'Create item'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function MovementDialog({
  item,
  onClose,
  onSave,
}: {
  item: StockItem
  onClose: () => void
  onSave: (item: StockItem, input: StockMovementInput) => Promise<void>
}) {
  const [type, setType] = useState<StockMovementInput['type']>('in')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      const input: StockMovementInput = type === 'in'
        ? { type, quantity: Number(quantity), unitCost: Number(unitCost), reason: reason.trim() }
        : { type, quantity: Number(quantity), reason: reason.trim() }
      await onSave(item, input)
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  const currentQuantity = quantityText(item.quantity, item.unit)
  const quantityLabel = type === 'count' ? `Counted quantity (${item.unit})` : `Quantity (${item.unit})`
  return (
    <Modal
      title={`Adjust ${item.name}`}
      description={`Current available stock: ${currentQuantity}`}
      onClose={onClose}
    >
      <form className="stock-form" onSubmit={submit}>
        <FormField label="Movement type">
          <AppSelect
            placeholder="Movement type"
            value={type}
            onChange={(event) => setType(event.target.value as StockMovementInput['type'])}
            options={[
              { value: 'in', label: 'Receive stock' },
              { value: 'out', label: 'Issue stock' },
              { value: 'count', label: 'Set counted balance' },
            ]}
          />
        </FormField>
        <FormField label={quantityLabel}>
          <AppTextField
            placeholder={quantityLabel}
            type="number"
            slotProps={{ htmlInput: { min: type === 'count' ? 0 : 0.001, step: 0.001 } }}
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </FormField>
        {type === 'in' && (
          <FormField label="Purchase price per unit (₹)">
            <AppTextField
              placeholder="Purchase price per unit (₹)"
              type="number"
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              required
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
            />
          </FormField>
        )}
        <FormField label="Reason / reference">
          <AppTextField
            multiline
            minRows={4}
            maxRows={4}
            required
            value={reason}
            onChange={(event) => setReason(capitalizeFirstLetter(event.target.value))}
            placeholder="e.g. Supplier delivery, kitchen issue, or physical count"
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />
        </FormField>
        {error && <p className="stock-form-error" role="alert">{error}</p>}
        <div className="stock-modal-actions">
          <button className="sfh-button sfh-button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="sfh-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Record movement'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CategoryDialog({
  category,
  onClose,
  onSave,
}: {
  category?: StockCategory
  onClose: () => void
  onSave: (input: StockCategoryInput, category?: StockCategory) => Promise<void>
}) {
  const [name, setName] = useState(capitalizeFirstLetter(category?.name ?? ''))
  const [description, setDescription] = useState(capitalizeFirstLetter(category?.description ?? ''))
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? '')
  const [displayOrder, setDisplayOrder] = useState<number | ''>(category?.displayOrder ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        ...(displayOrder === '' ? {} : { displayOrder }),
      }, category)
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      title={category ? 'Edit stock category' : 'Add stock category'}
      description="Categories help organize stock items and are shared across inventory."
      onClose={onClose}
    >
      <form className="stock-form" onSubmit={submit}>
        <FormField label="Category name">
          <input maxLength={80} required value={name} onChange={(event) => setName(capitalizeFirstLetter(event.target.value))} />
        </FormField>
        <FormField label="Description (optional)">
          <textarea maxLength={255} rows={3} value={description} onChange={(event) => setDescription(capitalizeFirstLetter(event.target.value))} />
        </FormField>
        <FormField label="Image URL (optional)">
          <input type="url" maxLength={2048} value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
        </FormField>
        <FormField label="Display order (optional)">
          <input type="number" min={1} max={100000} step={1} value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value === '' ? '' : Number(event.target.value))} />
        </FormField>
        {error && <p className="stock-form-error" role="alert">{error}</p>}
        <div className="stock-modal-actions">
          <button className="sfh-button sfh-button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="sfh-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : category ? 'Save changes' : 'Create category'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="stock-form-field">
      <span>{label}</span>
      {children}
    </label>
  )
}
