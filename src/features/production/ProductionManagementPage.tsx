import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Icon } from '../../components/common/Icon/Icon'
import { AppTooltip } from '../../components/common/Tooltip/AppTooltip'
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog'
import { TablePagination } from '../../components/tables/TablePagination/TablePagination'
import { AdminLayout } from '../../layouts/AdminLayout'
import type { AuthUser } from '../../types/auth.types'
import type { StockItem } from '../inventory/stock.types'
import {
  createMenuCategory,
  createMenuItem,
  createRecipe,
  createRecipeVersion,
  deleteMenuCategory,
  deleteMenuItem,
  getActiveStockItems,
  getMenuCategories,
  getMenuCategory,
  getMenuItems,
  getRecipes,
  setRecipeArchived,
  updateMenuCategory,
  updateMenuItem,
} from './productionService'
import { capitalizeFirstLetter } from '../../utils/capitalizeFirstLetter'
import type {
  MenuItem,
  MenuCategory,
  Recipe,
  RecipeVersionInput,
} from './production.types'
import './production.css'

type Tab = 'menu' | 'categories' | 'recipes'
type ProductionManagementView = 'menu' | 'recipes'
type ConfirmationState = {
  title: string
  message: string
  confirmLabel: string
  icon: 'delete' | 'deactivate'
  onConfirm: () => void
} | null

const TAB_ICONS: Record<Tab, string> = {
  recipes: '◇',
  menu: '▤',
  categories: '▦',
}

type IngredientDraft = {
  stockItemId: string
  quantity: string
  unit: string
  preparationNotes: string
  wastagePercentage: string
}

const UNIT_OPTIONS = ['kg', 'g', 'mg', 'lb', 'oz', 'l', 'ml', 'cl', 'cup', 'tbsp', 'tsp', 'piece', 'pieces', 'pc', 'pcs', 'each', 'plate', 'portion', 'packet']
const asNumber = (value: number | string | null | undefined) => Number(value ?? 0)
const quantityText = (value: number | string, unit: string) =>
  `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(asNumber(value))} ${unit}`
const moneyText = (value: number | string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(asNumber(value))
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'The production request could not be completed.'
const emptyIngredient = (): IngredientDraft => ({
  stockItemId: '',
  quantity: '',
  unit: '',
  preparationNotes: '',
  wastagePercentage: '0',
})

export function ProductionManagementPage({
  user,
  onLogout,
  view = 'menu',
}: {
  user: AuthUser
  onLogout: () => void
  view?: ProductionManagementView
}) {
  const [tab, setTab] = useState<Tab>(view === 'recipes' ? 'recipes' : 'menu')
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [categoryRows, setCategoryRows] = useState<MenuCategory[]>([])
  const [categoryPagination, setCategoryPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [categoryPage, setCategoryPage] = useState(1)
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryStatus, setCategoryStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [categorySort, setCategorySort] = useState<'displayOrder' | 'name' | 'createdAt'>('displayOrder')
  const [categoryOrder, setCategoryOrder] = useState<'asc' | 'desc'>('asc')
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [categoryError, setCategoryError] = useState('')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [categoryDisplayOrder, setCategoryDisplayOrder] = useState('')
  const [categoryIsActive, setCategoryIsActive] = useState(true)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showMenuForm, setShowMenuForm] = useState(false)
  const menuFormRef = useRef<HTMLFormElement>(null)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const recipeFormRef = useRef<HTMLFormElement>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [menuName, setMenuName] = useState('')
  const [menuCategory, setMenuCategory] = useState('')
  const [menuDescription, setMenuDescription] = useState('')
  const [menuPrice, setMenuPrice] = useState('')
  const [menuImageUrl, setMenuImageUrl] = useState('')
  const [menuVegetarian, setMenuVegetarian] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [recipeMenuItemId, setRecipeMenuItemId] = useState('')
  const [baseQuantity, setBaseQuantity] = useState('1')
  const [baseUnit, setBaseUnit] = useState('kg')
  const [expectedPlates, setExpectedPlates] = useState('1')
  const [recipeWastage, setRecipeWastage] = useState('0')
  const [cookingMinutes, setCookingMinutes] = useState('')
  const [instructions, setInstructions] = useState('')
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([emptyIngredient()])
  const categoryFormRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const form = showMenuForm
      ? menuFormRef.current
      : showCategoryForm
        ? categoryFormRef.current
        : showRecipeForm
          ? recipeFormRef.current
          : null
    form?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [
    tab,
    showMenuForm,
    editingMenuItem,
    showCategoryForm,
    editingCategory,
    showRecipeForm,
    editingRecipe,
  ])

  const canManage = user.role === 'admin' || user.role === 'manager'
  const isMenuView = view === 'menu'
  const tabs: Array<[Tab, string]> = isMenuView
    ? [['categories', 'Menu Categories'], ['menu', 'Menu Items']]
    : [['recipes', 'Recipes']]

  useEffect(() => {
    let active = true
    Promise.all([
      getMenuItems(),
      getRecipes('all'),
      getActiveStockItems(),
      getMenuCategories({ page: 1, limit: 100, status: 'active', sort: 'displayOrder', order: 'asc' }),
    ])
      .then(([menusResponse, recipesResponse, stockResponse, categoriesResponse]) => {
        if (!active) return
        setMenuItems(menusResponse.data ?? [])
        setRecipes(recipesResponse.data ?? [])
        setStockItems(stockResponse.data ?? [])
        setMenuCategories(categoriesResponse.data ?? [])
      })
      .catch((requestError: unknown) => {
        if (active) setError(errorText(requestError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [refreshKey])

  useEffect(() => {
    if (tab !== 'categories') return
    let active = true
    getMenuCategories({
      page: categoryPage,
      limit: 10,
      q: categorySearch,
      status: categoryStatus,
      sort: categorySort,
      order: categoryOrder,
    })
      .then((response) => {
        if (!active) return
        setCategoryError('')
        setCategoryRows(response.data ?? [])
        if (response.pagination) {
          setCategoryPagination(response.pagination)
          if (categoryPage > Math.max(response.pagination.totalPages, 1)) {
            setCategoryPage(Math.max(response.pagination.totalPages, 1))
          }
        }
      })
      .catch((requestError: unknown) => {
        if (active) setCategoryError(errorText(requestError))
      })
      .finally(() => {
        if (active) setCategoryLoading(false)
      })
    return () => { active = false }
  }, [tab, categoryPage, categorySearch, categoryStatus, categorySort, categoryOrder, refreshKey])

  function refresh() {
    setLoading(true)
    setError('')
    setCategoryError('')
    setCategoryLoading(true)
    setRefreshKey((key) => key + 1)
  }

  function resetCategoryFilters() {
    setCategorySearch('')
    setCategoryStatus('all')
    setCategorySort('displayOrder')
    setCategoryOrder('asc')
    setCategoryPage(1)
    refresh()
  }

  function startNewRecipe() {
    setEditingRecipe(null)
    setRecipeName('')
    setRecipeMenuItemId(menuItems.find((item) => item.isActive)?.id || '')
    setBaseQuantity('1')
    setBaseUnit('kg')
    setExpectedPlates('1')
    setRecipeWastage('0')
    setCookingMinutes('')
    setInstructions('')
    setIngredients([emptyIngredient()])
    setShowRecipeForm(true)
  }

  function startNewVersion(recipe: Recipe) {
    if (!recipe.current) return
    setEditingRecipe(recipe)
    setRecipeName(recipe.name)
    setRecipeMenuItemId(recipe.menuItem.id)
    setBaseQuantity(String(recipe.current.baseProductionQuantity))
    setBaseUnit(recipe.current.baseProductionUnit)
    setExpectedPlates(String(recipe.current.expectedPlateCount))
    setRecipeWastage(String(recipe.current.wastagePercentage))
    setCookingMinutes(recipe.current.cookingTimeMinutes === null ? '' : String(recipe.current.cookingTimeMinutes))
    setInstructions(capitalizeFirstLetter(recipe.current.preparationInstructions || ''))
    setIngredients(recipe.current.ingredients.map((ingredient) => ({
      stockItemId: ingredient.stockItemId,
      quantity: String(ingredient.quantity),
      unit: ingredient.unit,
      preparationNotes: capitalizeFirstLetter(ingredient.preparationNotes || ''),
      wastagePercentage: String(ingredient.wastagePercentage),
    })))
    setShowRecipeForm(true)
  }

  function startNewMenuItem() {
    setEditingMenuItem(null)
    setMenuName('')
    setMenuCategory(menuCategories[0]?.id || '')
    setMenuDescription('')
    setMenuPrice('')
    setMenuImageUrl('')
    setMenuVegetarian(false)
    setShowMenuForm(true)
  }

  function startEditMenuItem(item: MenuItem) {
    setEditingMenuItem(item)
    setMenuName(capitalizeFirstLetter(item.name))
    setMenuCategory(item.categoryId)
    setMenuDescription(capitalizeFirstLetter(item.description || ''))
    setMenuPrice(String(item.price))
    setMenuImageUrl(item.imageUrl || '')
    setMenuVegetarian(item.isVegetarian)
    setShowMenuForm(true)
  }

  function closeMenuForm() {
    setShowMenuForm(false)
    setEditingMenuItem(null)
  }

  async function submitMenuItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const input = {
      name: menuName.trim(),
      categoryId: menuCategory,
      isVegetarian: menuVegetarian,
      price: Number(menuPrice),
      description: menuDescription.trim() || null,
      imageUrl: menuImageUrl.trim() || null,
    }
    try {
      if (editingMenuItem) {
        await updateMenuItem(editingMenuItem.id, input)
        setNotice('Menu item updated.')
      } else {
        await createMenuItem(input)
        setNotice('Menu item created.')
      }
      closeMenuForm()
      refresh()
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setSaving(false)
    }
  }

  function startNewCategory() {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryDescription('')
    setCategoryDisplayOrder('')
    setCategoryIsActive(true)
    setShowCategoryForm(true)
    setCategoryError('')
  }

  async function startEditCategory(category: MenuCategory) {
    setCategoryError('')
    try {
      const response = await getMenuCategory(category.id)
      const selectedCategory = response.data ?? category
      setEditingCategory(selectedCategory)
      setCategoryName(capitalizeFirstLetter(selectedCategory.name))
      setCategoryDescription(capitalizeFirstLetter(selectedCategory.description || ''))
      setCategoryDisplayOrder(String(selectedCategory.displayOrder))
      setCategoryIsActive(selectedCategory.isActive)
      setShowCategoryForm(true)
    } catch (requestError) {
      setCategoryError(errorText(requestError))
    }
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setCategoryError('')
    setNotice('')
    const input = {
      name: categoryName.trim(),
      description: categoryDescription.trim() || null,
      ...(categoryDisplayOrder === '' ? {} : { displayOrder: Number(categoryDisplayOrder) }),
      isActive: categoryIsActive,
    }
    try {
      if (editingCategory) {
        await updateMenuCategory(editingCategory.id, input)
        setNotice('Menu category updated.')
      } else {
        await createMenuCategory(input)
        setNotice('Menu category created.')
      }
      setShowCategoryForm(false)
      setEditingCategory(null)
      refresh()
    } catch (requestError) {
      setCategoryError(errorText(requestError))
    } finally {
      setSaving(false)
    }
  }

  function removeMenuCategory(category: MenuCategory) {
    setConfirmation({
      title: 'Delete menu category?',
      message: `Delete or deactivate "${category.name}"? Categories with menu items will be deactivated.`,
      confirmLabel: 'Continue',
      icon: 'delete',
      onConfirm: () => {
        setConfirmation(null)
        void deleteMenuCategoryRequest(category)
      },
    })
  }

  async function deleteMenuCategoryRequest(category: MenuCategory) {
    setSaving(true)
    setCategoryError('')
    setNotice('')
    try {
      const response = await deleteMenuCategory(category.id)
      setNotice(response.data?.deactivated
        ? `"${category.name}" has menu items and was deactivated.`
        : `"${category.name}" was deleted.`)
      refresh()
    } catch (requestError) {
      setCategoryError(errorText(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function submitRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const input: RecipeVersionInput = {
      baseProductionQuantity: Number(baseQuantity),
      baseProductionUnit: baseUnit,
      expectedPlateCount: Number(expectedPlates),
      wastagePercentage: Number(recipeWastage),
      cookingTimeMinutes: cookingMinutes ? Number(cookingMinutes) : null,
      preparationInstructions: instructions.trim() || null,
      ingredients: ingredients.map((ingredient) => ({
        stockItemId: ingredient.stockItemId,
        quantity: Number(ingredient.quantity),
        unit: ingredient.unit,
        preparationNotes: ingredient.preparationNotes.trim() || null,
        wastagePercentage: Number(ingredient.wastagePercentage || 0),
      })),
    }
    try {
      if (editingRecipe) {
        await createRecipeVersion(editingRecipe.id, input)
        setNotice(`Recipe updated with version ${editingRecipe.currentVersion + 1}.`)
      } else {
        await createRecipe({ ...input, menuItemId: recipeMenuItemId, name: recipeName.trim() })
        setNotice('Recipe created.')
      }
      setShowRecipeForm(false)
      setEditingRecipe(null)
      refresh()
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function toggleMenuItem(item: MenuItem) {
    setSaving(true)
    setError('')
    try {
      await updateMenuItem(item.id, { isActive: !item.isActive })
      setNotice(`Menu item ${item.isActive ? 'deactivated' : 'activated'}.`)
      refresh()
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setSaving(false)
    }
  }

  function removeMenuItem(item: MenuItem) {
    setConfirmation({
      title: 'Delete menu item?',
      message: `Delete "${item.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete item',
      icon: 'delete',
      onConfirm: () => {
        setConfirmation(null)
        void deleteMenuItemRequest(item)
      },
    })
  }

  async function deleteMenuItemRequest(item: MenuItem) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await deleteMenuItem(item.id)
      setNotice(`"${item.name}" was deleted.`)
      refresh()
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function toggleRecipe(recipe: Recipe) {
    setSaving(true)
    setError('')
    try {
      await setRecipeArchived(recipe.id, !recipe.isArchived)
      setNotice(`Recipe ${recipe.isArchived ? 'restored' : 'archived'}.`)
      refresh()
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = user.role[0].toUpperCase() + user.role.slice(1)

  return (
    <AdminLayout user={user} roleLabel={roleLabel} sectionTitle={isMenuView ? 'Menu Management' : 'Recipes'} onLogout={onLogout}>
      <div className="production-page">
        <div className="production-heading">
          <div>
            <p className="eyebrow">{isMenuView ? 'MENU MANAGEMENT' : 'KITCHEN OPERATIONS'}</p>
            <h2>{isMenuView ? 'Menu Management' : 'Recipes'}</h2>
            <p className="production-subtitle">{isMenuView
              ? 'Manage menu categories and the dishes available to your customers.'
              : 'Create recipes, manage versions, and connect dishes with their ingredients.'}</p>
          </div>
          <button className="production-button production-button-secondary" onClick={refresh} disabled={loading || saving}>
            Refresh
          </button>
        </div>

        {error && <div className="production-alert production-alert-error" role="alert">{error}</div>}
        {notice && <div className="production-alert production-alert-success" role="status">{notice}</div>}

        <nav className="production-tabs" aria-label={isMenuView ? 'Menu management' : 'Recipe management'}>
          {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={tab === key ? 'production-tab active' : 'production-tab'}
          aria-selected={tab === key}
          role="tab"
          onClick={() => {
              setTab(key)
              setError('')
              setNotice('')
              if (key === 'categories') setCategoryError('')
          }}
        >
            <span className="production-tab-icon" aria-hidden="true">{TAB_ICONS[key]}</span>
            <span>{label}</span>
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="production-empty">Loading menu and recipe data…</div>
        ) : (
          <>
            {tab === 'menu' && (
              <section className="production-panel">
                <div className="production-panel-heading">
                  <div><h2>Menu items</h2><p>Menu items are the dishes linked to recipes.</p></div>
                  {canManage && <button className="production-button" onClick={startNewMenuItem}>
                    <Icon name="add" size={16} /> Add menu item
                  </button>}
                </div>
                {showMenuForm && (
                  <form ref={menuFormRef} className="production-form production-inline-form" onSubmit={submitMenuItem}>
                    <div className="production-form-title">
                      <div><h3>{editingMenuItem ? 'Edit menu item' : 'New menu item'}</h3><p>Add the dish details, menu price, and an optional image.</p></div>
                      <button type="button" className="production-text-button" onClick={closeMenuForm}>Close</button>
                    </div>
                    <label>Dish name<input value={menuName} onChange={(event) => setMenuName(capitalizeFirstLetter(event.target.value))} required maxLength={120} /></label>
                    <label>Category<select value={menuCategory} onChange={(event) => setMenuCategory(event.target.value)} required>
                      <option value="">Select a menu category</option>
                      {editingMenuItem && !menuCategories.some((category) => category.id === editingMenuItem.categoryId) && (
                        <option value={editingMenuItem.categoryId}>{editingMenuItem.category} (inactive)</option>
                      )}
                      {menuCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select></label>
                    <label>Price (₹)<input type="number" min="0" step="0.01" value={menuPrice} onChange={(event) => setMenuPrice(event.target.value)} required /></label>
                    <label>Image URL<input type="url" value={menuImageUrl} onChange={(event) => setMenuImageUrl(event.target.value)} placeholder="https://example.com/dish.jpg" /></label>
                    <label className="production-span-two">Description<textarea value={menuDescription} onChange={(event) => setMenuDescription(capitalizeFirstLetter(event.target.value))} maxLength={2000} rows={2} /></label>
                    <label className="production-checkbox"><input type="checkbox" checked={menuVegetarian} onChange={(event) => setMenuVegetarian(event.target.checked)} /> Vegetarian</label>
                    <div className="production-form-actions"><button className="production-button" disabled={saving}>{saving ? 'Saving…' : editingMenuItem ? 'Save changes' : 'Create menu item'}</button><button type="button" className="production-button production-button-secondary" onClick={closeMenuForm}>Cancel</button></div>
                  </form>
                )}
                <div className="production-menu-grid">
                  {menuItems.map((item) => {
                    const hasRecipe = recipes.some((recipe) => recipe.menuItem?.id === item.id)
                    return (
                      <article className={`production-menu-card${item.isActive ? '' : ' is-inactive'}`} key={item.id}>
                        <div className="production-menu-card-image">
                          {item.imageUrl
                            ? <img className="production-menu-photo" src={item.imageUrl} alt="" onError={(event) => { event.currentTarget.hidden = true }} />
                            : <span className="production-menu-image-placeholder">Menu item</span>}
                          <span className={`production-status ${item.isActive ? 'status-active' : 'status-inactive'}`}>{item.isActive ? 'Active' : 'Inactive'}</span>
                          <AppTooltip title={item.isVegetarian ? 'Vegetarian' : 'Non-vegetarian'}>
                            <span className="production-diet-badge">
                              <img
                                className="production-diet-icon"
                                src={item.isVegetarian ? '/images/veg.png' : '/images/nonveg.png'}
                                alt=""
                              />
                            </span>
                          </AppTooltip>
                          <div className="production-menu-card-overlay">
                            <div className="production-menu-card-title-row">
                              <div>
                                <span className="production-menu-card-category">{item.category}</span>
                                <h3>{item.name}</h3>
                              </div>
                              <strong>{moneyText(item.price)}</strong>
                            </div>
                            <p>{item.description || 'No description provided.'}</p>
                          </div>
                        </div>
                        <div className="production-menu-card-content">
                          <div className="production-menu-card-footer">
                            <span className={hasRecipe ? 'has-recipe' : ''}>{hasRecipe ? 'Recipe linked' : 'No recipe yet'}</span>
                            <div className="production-menu-card-actions">
                              <AppTooltip title={`View ${item.name}`}>
                                <button type="button" className="production-icon-button" aria-label={`View ${item.name}`} onClick={() => setSelectedMenuItem(item)}>
                                  <Icon name="view" size={16} />
                                </button>
                              </AppTooltip>
                              {canManage && <>
                                <AppTooltip title={`Edit ${item.name}`}>
                                  <span className="production-tooltip-anchor">
                                    <button type="button" className="production-icon-button" aria-label={`Edit ${item.name}`} onClick={() => startEditMenuItem(item)} disabled={saving}>
                                      <Icon name="edit" size={16} />
                                    </button>
                                  </span>
                                </AppTooltip>
                                <AppTooltip title={item.isActive ? `Deactivate ${item.name}` : `Activate ${item.name}`}>
                                  <span className="production-tooltip-anchor">
                                    <button
                                      type="button"
                                      className="production-icon-button"
                                      aria-label={`${item.isActive ? 'Deactivate' : 'Activate'} ${item.name}`}
                                      aria-pressed={item.isActive}
                                      onClick={() => void toggleMenuItem(item)}
                                      disabled={saving}
                                    >
                                      <Icon name={item.isActive ? 'deactivate' : 'activate'} size={16} />
                                    </button>
                                  </span>
                                </AppTooltip>
                                <AppTooltip title={`Delete ${item.name}`}>
                                  <span className="production-tooltip-anchor">
                                    <button type="button" className="production-icon-button danger" aria-label={`Delete ${item.name}`} onClick={() => removeMenuItem(item)} disabled={saving}>
                                      <Icon name="delete" size={16} />
                                    </button>
                                  </span>
                                </AppTooltip>
                              </>}
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                  {menuItems.length === 0 && <div className="production-empty production-menu-empty">Add your menu items to start building recipes.</div>}
                </div>
              </section>
            )}

            {tab === 'categories' && (
              <section className="production-panel">
                <div className="production-panel-heading">
                  <div>
                    <h2>Menu categories</h2>
                    <p>Organize dishes into a consistent menu. Linked categories are deactivated rather than removed.</p>
                  </div>
                  {canManage && <button className="production-button" onClick={startNewCategory}>Add category</button>}
                </div>
                {categoryError && <div className="production-alert production-alert-error" role="alert">{categoryError}</div>}
                {showCategoryForm && (
                  <form ref={categoryFormRef} className="production-form production-inline-form" onSubmit={submitCategory}>
                    <div className="production-form-title">
                      <div>
                        <h3>{editingCategory ? 'Edit menu category' : 'New menu category'}</h3>
                        <p>Leave display order blank to assign the next available position.</p>
                      </div>
                    </div>
                    <label>Category name<input value={categoryName} onChange={(event) => setCategoryName(capitalizeFirstLetter(event.target.value))} required maxLength={80} /></label>
                    <label>Display order<input type="number" min="0" step="1" value={categoryDisplayOrder} onChange={(event) => setCategoryDisplayOrder(event.target.value)} placeholder="Automatic" /></label>
                    <label className="production-span-two">Description<textarea value={categoryDescription} onChange={(event) => setCategoryDescription(capitalizeFirstLetter(event.target.value))} maxLength={255} rows={2} /></label>
                    {editingCategory && <label className="production-checkbox"><input type="checkbox" checked={categoryIsActive} onChange={(event) => setCategoryIsActive(event.target.checked)} /> Active</label>}
                    <div className="production-form-actions">
                      <button className="production-button" disabled={saving}>{saving ? 'Saving…' : editingCategory ? 'Save changes' : 'Create category'}</button>
                      <button type="button" className="production-button production-button-secondary" onClick={() => {
                        setShowCategoryForm(false)
                        setEditingCategory(null)
                      }}>Cancel</button>
                    </div>
                  </form>
                )}
                <div className="menu-category-toolbar">
                  <label>Search categories<input aria-label="Search menu categories" value={categorySearch} onChange={(event) => {
                    setCategorySearch(event.target.value)
                    setCategoryPage(1)
                    setCategoryLoading(true)
                    setCategoryError('')
                  }} placeholder="Name or description" /></label>
                  <label>Status<select aria-label="Filter menu categories" value={categoryStatus} onChange={(event) => {
                    setCategoryStatus(event.target.value as 'all' | 'active' | 'inactive')
                    setCategoryPage(1)
                    setCategoryLoading(true)
                    setCategoryError('')
                  }}>
                    <option value="all">All categories</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select></label>
                  <label>Sort by<select aria-label="Sort menu categories" value={categorySort} onChange={(event) => {
                    setCategorySort(event.target.value as 'displayOrder' | 'name' | 'createdAt')
                    setCategoryPage(1)
                    setCategoryLoading(true)
                    setCategoryError('')
                  }}>
                    <option value="displayOrder">Display order</option>
                    <option value="name">Name</option>
                    <option value="createdAt">Recently added</option>
                  </select></label>
                  <button className="production-button production-button-secondary" onClick={() => {
                    setCategoryOrder((order) => order === 'asc' ? 'desc' : 'asc')
                    setCategoryPage(1)
                    setCategoryLoading(true)
                    setCategoryError('')
                  }} aria-label={`Sort ${categoryOrder === 'asc' ? 'descending' : 'ascending'}`}>
                    {categoryOrder === 'asc' ? 'Ascending ↑' : 'Descending ↓'}
                  </button>
                  <button className="production-button production-button-secondary" type="button" onClick={resetCategoryFilters}>
                    <Icon name="reset" size={14} /> Reset filters
                  </button>
                </div>
                {categoryLoading ? (
                  <div className="production-empty">Loading menu categories…</div>
                ) : (
                  <>
                    <div className="production-table-wrap">
                      <table className="production-table">
                        <thead><tr><th>Category</th><th>Description</th><th>Menu items</th><th>Display order</th><th>Status</th>{canManage && <th>Actions</th>}</tr></thead>
                        <tbody>{categoryRows.map((category) => (
                          <tr key={category.id}>
                            <td><strong>{category.name}</strong></td>
                            <td>{category.description || '—'}</td>
                            <td>{category.menuItemCount}</td>
                            <td>{category.displayOrder}</td>
                            <td><span className={`production-status ${category.isActive ? 'status-active' : 'status-inactive'}`}>{category.isActive ? 'Active' : 'Inactive'}</span></td>
                            <td className="menu-category-actions">
                              <button className="production-text-button" onClick={() => setSelectedCategory(category)}>
                                <Icon name="view" size={14} /> View
                              </button>
                              {canManage && <>
                              <button className="production-text-button" onClick={() => void startEditCategory(category)} disabled={saving}>
                                <Icon name="edit" size={14} /> Edit
                              </button>
                              <button className="production-text-button" onClick={() => removeMenuCategory(category)} disabled={saving}>
                                <Icon name="delete" size={14} /> {category.isActive ? 'Delete' : 'Remove'}
                              </button>
                              </>}
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                      {categoryRows.length === 0 && <div className="production-empty">No categories match these filters.</div>}
                    </div>
                    <TablePagination
                      page={categoryPagination.page}
                      pageCount={Math.max(categoryPagination.totalPages, 1)}
                      alwaysShow={categoryPagination.total > 0}
                      label={`${categoryPagination.total} categories`}
                      onPageChange={(nextPage) => {
                        if (categoryLoading) return
                        setCategoryPage(nextPage)
                        setCategoryLoading(true)
                      }}
                    />
                  </>
                )}
              </section>
            )}

            {tab === 'recipes' && (
              <section className="production-panel">
                <div className="production-panel-heading">
                  <div><h2>Recipe book</h2><p>Every edit creates a new immutable version; prior production keeps its original cost snapshot.</p></div>
                  {canManage && <button className="production-button" onClick={startNewRecipe}>Create recipe</button>}
                </div>
                {showRecipeForm && (
                  <form ref={recipeFormRef} className="production-form production-recipe-form" onSubmit={submitRecipe}>
                    <div className="production-form-title">
                      <div><h3>{editingRecipe ? `New version for ${editingRecipe.name}` : 'Recipe setup'}</h3><p>Map each ingredient to an active stock item and its matching unit.</p></div>
                      <button type="button" className="production-text-button" onClick={() => setShowRecipeForm(false)}>Close</button>
                    </div>
                    {!editingRecipe && (
                      <>
                        <label>Menu item<select value={recipeMenuItemId} onChange={(event) => setRecipeMenuItemId(event.target.value)} required>
                          <option value="">Select a menu item</option>{menuItems.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select></label>
                        <label>Recipe name<input value={recipeName} onChange={(event) => setRecipeName(capitalizeFirstLetter(event.target.value))} required maxLength={120} /></label>
                      </>
                    )}
                    <label>Base batch quantity<input type="number" min="0.001" step="0.001" value={baseQuantity} onChange={(event) => setBaseQuantity(event.target.value)} required /></label>
                    <label>Batch unit                    <select value={baseUnit} onChange={(event) => setBaseUnit(event.target.value)}>{UNIT_OPTIONS.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
                    <label>Expected plates<input type="number" min="0.001" step="0.001" value={expectedPlates} onChange={(event) => setExpectedPlates(event.target.value)} required /></label>
                    <label>Recipe wastage %<input type="number" min="0" max="100" step="0.01" value={recipeWastage} onChange={(event) => setRecipeWastage(event.target.value)} /></label>
                    <label>Cooking time (minutes)<input type="number" min="0" step="1" value={cookingMinutes} onChange={(event) => setCookingMinutes(event.target.value)} /></label>
                    <label className="production-span-two">Preparation instructions<textarea value={instructions} onChange={(event) => setInstructions(capitalizeFirstLetter(event.target.value))} rows={3} maxLength={10000} /></label>
                    <div className="production-ingredient-editor production-span-two">
                      <div className="production-subheading"><h4>Ingredients</h4><button type="button" className="production-text-button" onClick={() => setIngredients((rows) => [...rows, emptyIngredient()])}>+ Add ingredient</button></div>
                      {ingredients.map((ingredient, index) => (
                        <div className="production-ingredient-row" key={`ingredient-${index}`}>
                          <label>Stock item<select value={ingredient.stockItemId} required onChange={(event) => {
                            const selected = stockItems.find((item) => item.id === event.target.value)
                            setIngredients((rows) => rows.map((row, rowIndex) => rowIndex === index
                              ? { ...row, stockItemId: event.target.value, unit: selected?.unit || '' }
                              : row))
                          }}><option value="">Select stock item</option>{stockItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></label>
                          <label>Quantity<input type="number" min="0.001" step="0.001" value={ingredient.quantity} required onChange={(event) => setIngredients((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: event.target.value } : row))} /></label>
                          <label>Recipe unit<select value={ingredient.unit} required onChange={(event) => setIngredients((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, unit: event.target.value } : row))}><option value="">Select unit</option>{UNIT_OPTIONS.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
                          <label>Wastage %<input type="number" min="0" max="100" step="0.01" value={ingredient.wastagePercentage} onChange={(event) => setIngredients((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, wastagePercentage: event.target.value } : row))} /></label>
                          <label className="production-span-two">Preparation note<input value={ingredient.preparationNotes} maxLength={255} onChange={(event) => setIngredients((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, preparationNotes: capitalizeFirstLetter(event.target.value) } : row))} /></label>
                          {ingredients.length > 1 && <button type="button" className="production-text-button production-remove" onClick={() => setIngredients((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>Remove</button>}
                        </div>
                      ))}
                    </div>
                    <div className="production-form-actions production-span-two"><button className="production-button" disabled={saving}>{saving ? 'Saving…' : editingRecipe ? 'Save new version' : 'Create recipe'}</button><button type="button" className="production-button production-button-secondary" onClick={() => setShowRecipeForm(false)}>Cancel</button></div>
                  </form>
                )}
                <div className="production-recipe-grid">
                  {recipes.map((recipe) => (
                    <article className={`production-recipe-card${recipe.isArchived ? ' is-archived' : ''}`} key={recipe.id}>
                      <div className="production-recipe-card-top"><span className="production-recipe-mark">R</span><span className={`production-status ${recipe.isArchived ? 'status-inactive' : 'status-active'}`}>{recipe.isArchived ? 'Archived' : `Version ${recipe.currentVersion}`}</span></div>
                      <h3>{recipe.name}</h3><p className="production-recipe-menu">{recipe.menuItem?.name || 'Menu item unavailable'}</p>
                      {recipe.current && <div className="production-recipe-meta">
                        <span>Batch {quantityText(recipe.current.baseProductionQuantity, recipe.current.baseProductionUnit)}</span>
                        <span>{quantityText(recipe.current.expectedPlateCount, 'plates')}</span>
                        <span>{recipe.current.ingredients?.length || 0} ingredients</span>
                      </div>}
                      <div className="production-card-actions">
                        {canManage && !recipe.isArchived && <button className="production-text-button" onClick={() => startNewVersion(recipe)} disabled={!recipe.current}>
                          <Icon name="edit" size={14} /> Edit recipe
                        </button>}
                        {canManage && <button className="production-text-button" onClick={() => void toggleRecipe(recipe)} disabled={saving}>
                          <Icon name={recipe.isArchived ? 'activate' : 'deactivate'} size={14} /> {recipe.isArchived ? 'Restore' : 'Archive'}
                        </button>}
                      </div>
                    </article>
                  ))}
                </div>
                {recipes.length === 0 && !showRecipeForm && <div className="production-empty">Create a menu item first, then add its recipe.</div>}
              </section>
            )}

          </>
        )}
      </div>

      {selectedMenuItem && <div className="production-modal-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setSelectedMenuItem(null)
      }}>
        <section className="production-modal production-menu-detail" role="dialog" aria-modal="true" aria-labelledby="menu-item-detail-title">
          <div className="production-modal-heading">
            <div><p className="eyebrow">MENU ITEM</p><h2 id="menu-item-detail-title">{selectedMenuItem.name}</h2></div>
            <button type="button" className="production-modal-close" onClick={() => setSelectedMenuItem(null)} aria-label="Close details"><Icon name="close" size={18} /></button>
          </div>
          {selectedMenuItem.imageUrl && <img className="production-menu-detail-image" src={selectedMenuItem.imageUrl} alt={selectedMenuItem.name} onError={(event) => { event.currentTarget.hidden = true }} />}
          <div className="production-menu-detail-meta">
            <span className={`production-status ${selectedMenuItem.isActive ? 'status-active' : 'status-inactive'}`}>{selectedMenuItem.isActive ? 'Active' : 'Inactive'}</span>
            <span><img src={selectedMenuItem.isVegetarian ? '/images/veg.png' : '/images/nonveg.png'} alt={selectedMenuItem.isVegetarian ? 'Vegetarian' : 'Non-vegetarian'} />{selectedMenuItem.isVegetarian ? 'Vegetarian' : 'Non-vegetarian'}</span>
            <strong>{moneyText(selectedMenuItem.price)}</strong>
          </div>
          <p className="production-menu-detail-category">{selectedMenuItem.category}</p>
          <p className="production-menu-detail-description">{selectedMenuItem.description || 'No description provided.'}</p>
          <p className="production-menu-detail-recipe">
            {recipes.some((recipe) => recipe.menuItem?.id === selectedMenuItem.id) ? 'A recipe is linked to this menu item.' : 'No recipe is linked to this menu item yet.'}
          </p>
        </section>
      </div>}

      {selectedCategory && <div className="production-modal-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setSelectedCategory(null)
      }}>
        <section className="production-modal production-category-detail" role="dialog" aria-modal="true" aria-labelledby="menu-category-detail-title">
          <div className="production-modal-heading">
            <div><p className="eyebrow">MENU CATEGORY</p><h2 id="menu-category-detail-title">{selectedCategory.name}</h2></div>
            <button type="button" className="production-modal-close" onClick={() => setSelectedCategory(null)} aria-label="Close details">
              <Icon name="close" size={18} />
            </button>
          </div>
          <div className="production-menu-detail-meta">
            <span className={`production-status ${selectedCategory.isActive ? 'status-active' : 'status-inactive'}`}>
              {selectedCategory.isActive ? 'Active' : 'Inactive'}
            </span>
            <span>{selectedCategory.menuItemCount} menu items</span>
            <span>Display order {selectedCategory.displayOrder}</span>
          </div>
          <p className="production-menu-detail-description">{selectedCategory.description || 'No description provided.'}</p>
        </section>
      </div>}

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

