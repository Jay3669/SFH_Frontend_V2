import { useEffect, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@mui/material";
import {
    Archive,
    ArrowDown,
    ArrowUp,
    ChefHat,
    Clock3,
    Leaf,
    Package,
    Search,
    Sparkles,
    Utensils,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/common/Icon/Icon";
import { AutoDismissMessage } from "../../components/common/AutoDismissMessage/AutoDismissMessage";
import { AppButton } from "../../components/common/AppButton";
import { AppSelect } from "../../components/common/AppSelect";
import { ApiLoadingIndicator } from "../../components/loaders/ApiLoadingIndicator";
import { AppTooltip } from "../../components/common/Tooltip/AppTooltip";
import { ConfirmDialog } from "../../components/dialogs/ConfirmDialog";
import { TablePagination } from "../../components/tables/TablePagination/TablePagination";
import { AdminLayout } from "../../layouts/AdminLayout";
import { routes } from "../../app/router/routes";
import type { AuthUser } from "../../types/auth.types";
import noCategoryImage from "../../assets/images/no-category-image.png";
import type { StockItem } from "../inventory/stock.types";
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
} from "./productionService";
import { capitalizeFirstLetter } from "../../utils/capitalizeFirstLetter";
import type {
    MenuItem,
    MenuCategory,
    Recipe,
    RecipeVersionInput,
} from "./production.types";
import "./production.css";

type Tab = "menu" | "categories" | "recipes";
type ProductionManagementView = "menu" | "recipes";
type ConfirmationState = {
    title: string;
    message: string;
    confirmLabel: string;
    icon: "delete" | "deactivate";
    onConfirm: () => void;
} | null;

const TAB_ICONS: Record<Tab, string> = {
    recipes: "◇",
    menu: "▤",
    categories: "▦",
};

type IngredientDraft = {
    stockItemId: string;
    quantity: string;
    unit: string;
    preparationNotes: string;
    wastagePercentage: string;
};

const UNIT_OPTIONS = [
    "kg",
    "g",
    "mg",
    "lb",
    "oz",
    "l",
    "ml",
    "cl",
    "cup",
    "tbsp",
    "tsp",
    "piece",
    "pieces",
    "pc",
    "pcs",
    "each",
    "plate",
    "portion",
    "packet",
];
const asNumber = (value: number | string | null | undefined) =>
    Number(value ?? 0);
const quantityText = (value: number | string, unit: string) =>
    `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(asNumber(value))} ${unit}`;
const moneyText = (value: number | string) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(asNumber(value));
const errorText = (error: unknown) =>
    error instanceof Error
        ? error.message
        : "The production request could not be completed.";
const nextMenuItemDisplayOrder = (items: readonly MenuItem[]) =>
    items.reduce(
        (next, item) =>
            Number.isInteger(item.displayOrder)
                ? Math.max(next, item.displayOrder + 1)
                : next,
        1,
    );
const emptyIngredient = (): IngredientDraft => ({
    stockItemId: "",
    quantity: "",
    unit: "",
    preparationNotes: "",
    wastagePercentage: "0",
});

async function getAllMenuCategories() {
    const limit = 10;
    const query = {
        limit,
        status: "all" as const,
        sort: "displayOrder" as const,
        order: "asc" as const,
    };
    const firstPage = await getMenuCategories({ ...query, page: 1 });
    const categories = [...(firstPage.data ?? [])];
    const totalPages =
        firstPage.pagination?.totalPages ??
        Math.ceil((firstPage.pagination?.total ?? categories.length) / limit);

    for (let page = 2; page <= totalPages; page += 1) {
        const response = await getMenuCategories({ ...query, page });
        categories.push(...(response.data ?? []));
    }

    return categories;
}

export function ProductionManagementPage({
    user,
    onLogout,
    view = "menu",
}: {
    user: AuthUser;
    onLogout: () => void;
    view?: ProductionManagementView;
}) {
    const [tab, setTab] = useState<Tab>(view === "recipes" ? "recipes" : "menu");
    const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
    const [categoryRows, setCategoryRows] = useState<MenuCategory[]>([]);
    const [categoryPagination, setCategoryPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [categoryPage, setCategoryPage] = useState(1);
    const [categorySearch, setCategorySearch] = useState("");
    const [categorySearchText, setCategorySearchText] = useState("");
    const [categoryStatus, setCategoryStatus] = useState<
        "all" | "active" | "inactive"
    >("all");
    const [categorySort, setCategorySort] = useState<
        "displayOrder" | "name" | "createdAt"
    >("displayOrder");
    const [categoryOrder, setCategoryOrder] = useState<"asc" | "desc">("asc");
    const [categoryLoading, setCategoryLoading] = useState(true);
    const [categoryError, setCategoryError] = useState("");
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
        null,
    );
    const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(
        null,
    );
    const [categoryName, setCategoryName] = useState("");
    const [categoryDescription, setCategoryDescription] = useState("");
    const [categoryImageUrl, setCategoryImageUrl] = useState("");
    const [categoryDisplayOrder, setCategoryDisplayOrder] = useState("");
    const [categoryIsActive, setCategoryIsActive] = useState(true);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [menuPage, setMenuPage] = useState(1);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [menuCategoriesLoading, setMenuCategoriesLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [showMenuForm, setShowMenuForm] = useState(false);
    const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
    const menuCategoryRequestId = useRef(0);
    const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(
        null,
    );
    const [showRecipeForm, setShowRecipeForm] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [recipeSearch, setRecipeSearch] = useState("");
    const [recipeStatusFilter, setRecipeStatusFilter] = useState<
        "all" | "active" | "archived"
    >("all");
    const [menuName, setMenuName] = useState("");
    const [menuCategory, setMenuCategory] = useState("");
    const [menuDisplayOrder, setMenuDisplayOrder] = useState("1");
    const [menuDescription, setMenuDescription] = useState("");
    const [menuPrice, setMenuPrice] = useState("");
    const [menuImageUrl, setMenuImageUrl] = useState("");
    const [menuVegetarian, setMenuVegetarian] = useState(false);
    const [recipeName, setRecipeName] = useState("");
    const [recipeMenuItemId, setRecipeMenuItemId] = useState("");
    const [baseQuantity, setBaseQuantity] = useState("1");
    const [baseUnit, setBaseUnit] = useState("kg");
    const [expectedPlates, setExpectedPlates] = useState("1");
    const [recipeWastage, setRecipeWastage] = useState("0");
    const [cookingMinutes, setCookingMinutes] = useState("");
    const [instructions, setInstructions] = useState("");
    const [ingredients, setIngredients] = useState<IngredientDraft[]>([
        emptyIngredient(),
    ]);
    const canManage = user.role === "admin" || user.role === "manager";
    const isMenuView = view === "menu";
    const menuPageCount = Math.ceil(menuItems.length / 10);
    const currentMenuPage = Math.min(menuPage, Math.max(menuPageCount, 1));
    const visibleMenuItems = menuItems.slice(
        (currentMenuPage - 1) * 10,
        currentMenuPage * 10,
    );
    const activeMenuItems = menuItems.filter((item) => item.isActive);
    const activeStockItems = stockItems.filter((item) => item.isActive);
    const normalizedRecipeSearch = recipeSearch.trim().toLowerCase();
    const visibleRecipes = recipes.filter((recipe) => {
        const statusMatches =
            recipeStatusFilter === "all" ||
            (recipeStatusFilter === "archived"
                ? recipe.isArchived
                : !recipe.isArchived);
        const searchableText = [
            recipe.name,
            recipe.menuItem?.name,
            recipe.menuItem?.category,
            ...(recipe.current?.ingredients ?? []).map((ingredient) =>
                stockItems.find((stockItem) => stockItem.id === ingredient.stockItemId)
                    ?.name,
            ),
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        return statusMatches && searchableText.includes(normalizedRecipeSearch);
    });
    const selectedRecipeMenuItem = activeMenuItems.find(
        (item) => item.id === recipeMenuItemId,
    );
    const tabs: Array<[Tab, string]> = isMenuView
        ? [
            ["menu", "Menu Items"],
            ["categories", "Menu Categories"],
        ]
        : [["recipes", "Recipes"]];

    useEffect(() => {
        let active = true;
        Promise.all([
            getMenuItems(),
            getRecipes("all"),
            getActiveStockItems(),
        ])
            .then(([menusResponse, recipesResponse, stockResponse]) => {
                if (!active) return;
                setMenuItems(menusResponse.data ?? []);
                setRecipes(recipesResponse.data ?? []);
                setStockItems(stockResponse.data ?? []);
            })
            .catch((requestError: unknown) => {
                if (active) setError(errorText(requestError));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [refreshKey]);

    async function loadMenuCategoriesForForm(selectedCategoryId?: string) {
        const requestId = ++menuCategoryRequestId.current;
        setMenuCategoriesLoading(true);
        setMenuCategories([]);
        try {
            const categories = await getAllMenuCategories();
            if (requestId !== menuCategoryRequestId.current) return;
            setMenuCategories(categories);
            setMenuCategory(selectedCategoryId ?? categories[0]?.id ?? "");
        } catch (requestError) {
            if (requestId === menuCategoryRequestId.current) {
                setError(errorText(requestError));
            }
        } finally {
            if (requestId === menuCategoryRequestId.current) {
                setMenuCategoriesLoading(false);
            }
        }
    }

    useEffect(() => {
        if (tab !== "categories") return;
        let active = true;
        getMenuCategories({
            page: categoryPage,
            limit: 10,
            q: categorySearch,
            status: categoryStatus,
            sort: categorySort,
            order: categoryOrder,
        })
            .then((response) => {
                if (!active) return;
                setCategoryError("");
                setCategoryRows(response.data ?? []);
                if (response.pagination) {
                    setCategoryPagination(response.pagination);
                    if (categoryPage > Math.max(response.pagination.totalPages, 1)) {
                        setCategoryPage(Math.max(response.pagination.totalPages, 1));
                    }
                }
            })
            .catch((requestError: unknown) => {
                if (active) setCategoryError(errorText(requestError));
            })
            .finally(() => {
                if (active) setCategoryLoading(false);
            });
        return () => {
            active = false;
        };
    }, [
        tab,
        categoryPage,
        categorySearch,
        categoryStatus,
        categorySort,
        categoryOrder,
        refreshKey,
    ]);

    function refresh() {
        setLoading(true);
        setError("");
        setCategoryError("");
        setCategoryLoading(true);
        setRefreshKey((key) => key + 1);
    }

    function resetCategoryFilters() {
        setCategorySearch("");
        setCategorySearchText("");
        setCategoryStatus("all");
        setCategorySort("displayOrder");
        setCategoryOrder("asc");
        setCategoryPage(1);
        refresh();
    }

    function submitCategorySearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const nextSearch = categorySearchText.trim();
        if (nextSearch === categorySearch && categoryPage === 1) return;
        setCategorySearch(nextSearch);
        setCategoryPage(1);
        setCategoryLoading(true);
        setCategoryError("");
    }

    function changeCategoryOrder(order: "asc" | "desc") {
        if (order === categoryOrder) return;
        setCategoryOrder(order);
        setCategoryPage(1);
        setCategoryLoading(true);
        setCategoryError("");
    }

    function startNewRecipe() {
        setError("");
        setEditingRecipe(null);
        setRecipeName("");
        setRecipeMenuItemId("");
        setBaseQuantity("1");
        setBaseUnit("kg");
        setExpectedPlates("1");
        setRecipeWastage("0");
        setCookingMinutes("");
        setInstructions("");
        setIngredients([emptyIngredient()]);
        setShowRecipeForm(true);
    }

    function startNewVersion(recipe: Recipe) {
        if (!recipe.current) return;
        setError("");
        setEditingRecipe(recipe);
        setRecipeName(recipe.name);
        setRecipeMenuItemId(recipe.menuItem.id);
        setBaseQuantity(String(recipe.current.baseProductionQuantity));
        setBaseUnit(recipe.current.baseProductionUnit);
        setExpectedPlates(String(recipe.current.expectedPlateCount));
        setRecipeWastage(String(recipe.current.wastagePercentage));
        setCookingMinutes(
            recipe.current.cookingTimeMinutes === null
                ? ""
                : String(recipe.current.cookingTimeMinutes),
        );
        setInstructions(
            capitalizeFirstLetter(recipe.current.preparationInstructions || ""),
        );
        setIngredients(
            recipe.current.ingredients.map((ingredient) => ({
                stockItemId: ingredient.stockItemId,
                quantity: String(ingredient.quantity),
                unit: ingredient.unit,
                preparationNotes: capitalizeFirstLetter(
                    ingredient.preparationNotes || "",
                ),
                wastagePercentage: String(ingredient.wastagePercentage),
            })),
        );
        setShowRecipeForm(true);
    }

    function startNewMenuItem() {
        setError("");
        setEditingMenuItem(null);
        setMenuName("");
        setMenuCategory("");
        setMenuDisplayOrder(String(nextMenuItemDisplayOrder(menuItems)));
        setMenuDescription("");
        setMenuPrice("");
        setMenuImageUrl("");
        setMenuVegetarian(false);
        setShowMenuForm(true);
        void loadMenuCategoriesForForm();
    }

    function startEditMenuItem(item: MenuItem) {
        setEditingMenuItem(item);
        setMenuName(capitalizeFirstLetter(item.name));
        setMenuCategory(item.categoryId);
        setMenuDisplayOrder(String(item.displayOrder));
        setMenuDescription(capitalizeFirstLetter(item.description || ""));
        setMenuPrice(String(item.price));
        setMenuImageUrl(item.imageUrl || "");
        setMenuVegetarian(item.isVegetarian);
        setShowMenuForm(true);
        void loadMenuCategoriesForForm(item.categoryId);
    }

    function closeMenuForm() {
        menuCategoryRequestId.current += 1;
        setMenuCategoriesLoading(false);
        setShowMenuForm(false);
        setEditingMenuItem(null);
        setError("");
    }

    async function submitMenuItem(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        const input = {
            name: menuName.trim(),
            categoryId: menuCategory,
            displayOrder: Number(menuDisplayOrder),
            isVegetarian: menuVegetarian,
            price: Number(menuPrice),
            description: menuDescription.trim() || null,
            imageUrl: menuImageUrl.trim() || null,
        };
        try {
            if (editingMenuItem) {
                await updateMenuItem(editingMenuItem.id, input);
                setNotice("Menu item updated.");
            } else {
                await createMenuItem(input);
                setNotice("Menu item created.");
            }
            closeMenuForm();
            refresh();
        } catch (requestError) {
            setError(errorText(requestError));
        } finally {
            setSaving(false);
        }
    }

    function startNewCategory() {
        setEditingCategory(null);
        setCategoryName("");
        setCategoryDescription("");
        setCategoryImageUrl("");
        setCategoryDisplayOrder("");
        setCategoryIsActive(true);
        setShowCategoryForm(true);
        setCategoryError("");
    }

    function closeCategoryForm() {
        setShowCategoryForm(false);
        setEditingCategory(null);
        setCategoryError("");
    }

    function closeRecipeForm() {
        setShowRecipeForm(false);
        setEditingRecipe(null);
        setError("");
    }

    async function startEditCategory(category: MenuCategory) {
        setCategoryError("");
        try {
            const response = await getMenuCategory(category.id);
            const selectedCategory = response.data ?? category;
            setEditingCategory(selectedCategory);
            setCategoryName(capitalizeFirstLetter(selectedCategory.name));
            setCategoryDescription(
                capitalizeFirstLetter(selectedCategory.description || ""),
            );
            setCategoryImageUrl(selectedCategory.imageUrl || "");
            setCategoryDisplayOrder(String(selectedCategory.displayOrder));
            setCategoryIsActive(selectedCategory.isActive);
            setShowCategoryForm(true);
        } catch (requestError) {
            setCategoryError(errorText(requestError));
        }
    }

    async function submitCategory(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setCategoryError("");
        setNotice("");
        const input = {
            name: categoryName.trim(),
            description: categoryDescription.trim() || null,
            imageUrl: categoryImageUrl.trim() || null,
            ...(categoryDisplayOrder === ""
                ? {}
                : { displayOrder: Number(categoryDisplayOrder) }),
            isActive: categoryIsActive,
        };
        try {
            if (editingCategory) {
                await updateMenuCategory(editingCategory.id, input);
                setNotice("Menu category updated.");
            } else {
                await createMenuCategory(input);
                setNotice("Menu category created.");
            }
            closeCategoryForm();
            refresh();
        } catch (requestError) {
            setCategoryError(errorText(requestError));
        } finally {
            setSaving(false);
        }
    }

    function removeMenuCategory(category: MenuCategory) {
        setConfirmation({
            title: "Delete menu category?",
            message: `Delete or deactivate "${category.name}"? Categories with menu items will be deactivated.`,
            confirmLabel: "Continue",
            icon: "delete",
            onConfirm: () => {
                setConfirmation(null);
                void deleteMenuCategoryRequest(category);
            },
        });
    }

    async function deleteMenuCategoryRequest(category: MenuCategory) {
        setSaving(true);
        setCategoryError("");
        setNotice("");
        try {
            const response = await deleteMenuCategory(category.id);
            setNotice(
                response.data?.deactivated
                    ? `"${category.name}" has menu items and was deactivated.`
                    : `"${category.name}" was deleted.`,
            );
            refresh();
        } catch (requestError) {
            setCategoryError(errorText(requestError));
        } finally {
            setSaving(false);
        }
    }

    async function submitRecipe(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError("");
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
        };
        try {
            if (editingRecipe) {
                await createRecipeVersion(editingRecipe.id, input);
                setNotice(
                    `Recipe updated with version ${editingRecipe.currentVersion + 1}.`,
                );
            } else {
                await createRecipe({
                    ...input,
                    menuItemId: recipeMenuItemId,
                    name: recipeName.trim(),
                });
                setNotice("Recipe created.");
            }
            closeRecipeForm();
            refresh();
        } catch (requestError) {
            setError(errorText(requestError));
        } finally {
            setSaving(false);
        }
    }

    async function toggleMenuItem(item: MenuItem) {
        setSaving(true);
        setError("");
        try {
            await updateMenuItem(item.id, { isActive: !item.isActive });
            setNotice(`Menu item ${item.isActive ? "deactivated" : "activated"}.`);
            refresh();
        } catch (requestError) {
            setError(errorText(requestError));
        } finally {
            setSaving(false);
        }
    }

    function removeMenuItem(item: MenuItem) {
        setConfirmation({
            title: "Delete menu item?",
            message: `Delete "${item.name}"? This action cannot be undone.`,
            confirmLabel: "Delete item",
            icon: "delete",
            onConfirm: () => {
                setConfirmation(null);
                void deleteMenuItemRequest(item);
            },
        });
    }

    async function deleteMenuItemRequest(item: MenuItem) {
        setSaving(true);
        setError("");
        setNotice("");
        try {
            await deleteMenuItem(item.id);
            setNotice(`"${item.name}" was deleted.`);
            refresh();
        } catch (requestError) {
            setError(errorText(requestError));
        } finally {
            setSaving(false);
        }
    }

    async function toggleRecipe(recipe: Recipe) {
        setSaving(true);
        setError("");
        try {
            await setRecipeArchived(recipe.id, !recipe.isArchived);
            setNotice(`Recipe ${recipe.isArchived ? "restored" : "archived"}.`);
            refresh();
        } catch (requestError) {
            setError(errorText(requestError));
        } finally {
            setSaving(false);
        }
    }

    const roleLabel = user.role[0].toUpperCase() + user.role.slice(1);

    return (
        <AdminLayout
            user={user}
            roleLabel={roleLabel}
            sectionTitle={isMenuView ? "Menu Management" : "Recipes"}
            onLogout={onLogout}
        >
            <div className={`production-page${isMenuView ? "" : " recipes-page"}`}>
                <div className={`production-heading${isMenuView ? "" : " recipes-page-heading"}`}>
                    <div>
                        <p className="eyebrow">
                            {isMenuView ? "MENU MANAGEMENT" : "CULINARY WORKSPACE"}
                        </p>
                        {isMenuView ? <h2>Menu Management</h2> : <h1>Recipes</h1>}
                        <p className={isMenuView ? "production-subtitle" : "recipes-page-subtitle"}>
                            {isMenuView
                                ? "Manage menu categories and the dishes available to your customers."
                                : "Create recipes, manage versions, and connect dishes with their ingredients."}
                        </p>
                    </div>
                    <button
                        className={`production-button production-button-secondary${isMenuView ? "" : " recipes-refresh-button"}`}
                        onClick={refresh}
                        disabled={loading || saving}
                    >
                        Refresh
                    </button>
                </div>

                {error && (
                    <AutoDismissMessage message={error} onDismiss={() => setError("")}>
                        <div
                            className="production-alert production-alert-error"
                            role="alert"
                        >
                            {error}
                        </div>
                    </AutoDismissMessage>
                )}
                {notice && (
                    <AutoDismissMessage message={notice} onDismiss={() => setNotice("")}>
                        <div
                            className="production-alert production-alert-success"
                            role="status"
                        >
                            {notice}
                        </div>
                    </AutoDismissMessage>
                )}

                {isMenuView && (
                    <nav className="production-tabs" aria-label="Menu management">
                        {tabs.map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                className={
                                    tab === key ? "production-tab active" : "production-tab"
                                }
                                aria-selected={tab === key}
                                role="tab"
                                onClick={() => {
                                    setTab(key);
                                    setError("");
                                    setNotice("");
                                    if (key === "categories") setCategoryError("");
                                }}
                            >
                                <span className="production-tab-icon" aria-hidden="true">
                                    {TAB_ICONS[key]}
                                </span>
                                <span>{label}</span>
                            </button>
                        ))}
                    </nav>
                )}

                {loading ? (
                    <div className="production-empty">
                        <ApiLoadingIndicator
                            label="Loading menu and recipe data…"
                            compact
                        />
                    </div>
                ) : (
                    <>
                        {tab === "menu" && (
                            <section className="production-panel">
                                <div className="production-panel-heading">
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-start" }}>
                                        <h2>Menu items</h2>
                                        <p>Menu items are the dishes linked to recipes.</p>
                                    </div>
                                    {canManage && (
                                        <button
                                            className="production-button"
                                            onClick={startNewMenuItem}
                                        >
                                            <Icon name="add" size={16} /> Add menu item
                                        </button>
                                    )}
                                </div>
                                {showMenuForm && (
                                    <Dialog
                                        open
                                        fullWidth
                                        maxWidth="md"
                                        className="sfh-form-dialog"
                                        onClose={closeMenuForm}
                                        aria-labelledby="menu-item-form-title"
                                        aria-describedby="menu-item-form-description"
                                    >
                                        <form
                                            className="production-form production-dialog-form sfh-dialog-form"
                                            onSubmit={submitMenuItem}
                                        >
                                            <div className="production-form-title">
                                                <div>
                                                    <h3 id="menu-item-form-title">
                                                        {editingMenuItem
                                                            ? "Edit menu item"
                                                            : "New menu item"}
                                                    </h3>
                                                    <p id="menu-item-form-description">
                                                        Add the dish details, menu price, and an optional
                                                        image.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="production-modal-close"
                                                    onClick={closeMenuForm}
                                                    aria-label="Close dialog"
                                                >
                                                    <Icon name="close" size={18} />
                                                </button>
                                            </div>
                                            {error && (
                                                <AutoDismissMessage
                                                    message={error}
                                                    onDismiss={() => setError("")}
                                                >
                                                    <div
                                                        className="production-alert production-alert-error production-span-two"
                                                        role="alert"
                                                    >
                                                        {error}
                                                    </div>
                                                </AutoDismissMessage>
                                            )}
                                            <label>
                                                Dish name
                                                <input
                                                    value={menuName}
                                                    onChange={(event) =>
                                                        setMenuName(
                                                            capitalizeFirstLetter(event.target.value),
                                                        )
                                                    }
                                                    required
                                                    maxLength={120}
                                                />
                                            </label>
                                            <label>
                                                Category
                                                <AppSelect
                                                    value={menuCategory}
                                                    onChange={(event) =>
                                                        setMenuCategory(event.target.value)
                                                    }
                                                    disabled={menuCategoriesLoading}
                                                    required
                                                    options={[
                                                        {
                                                            value: "",
                                                            label: menuCategoriesLoading
                                                                ? "Loading menu categories…"
                                                                : "Select a menu category",
                                                        },
                                                        ...(editingMenuItem &&
                                                            !menuCategories.some(
                                                                (category) =>
                                                                    category.id === editingMenuItem.categoryId,
                                                            )
                                                            ? [
                                                                {
                                                                    value: editingMenuItem.categoryId,
                                                                    label: `${editingMenuItem.category} (inactive)`,
                                                                },
                                                            ]
                                                            : []),
                                                        ...menuCategories.map((category) => ({
                                                            value: category.id,
                                                            label: category.name,
                                                        })),
                                                    ]}
                                                />
                                            </label>
                                            <label>
                                                Price (₹)
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={menuPrice}
                                                    onChange={(event) => setMenuPrice(event.target.value)}
                                                    required
                                                />
                                            </label>
                                            <label>
                                                Display order
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="2147483647"
                                                    step="1"
                                                    value={menuDisplayOrder}
                                                    onChange={(event) =>
                                                        setMenuDisplayOrder(event.target.value)
                                                    }
                                                    required
                                                />
                                            </label>
                                            <label>
                                                Image URL
                                                <input
                                                    type="url"
                                                    value={menuImageUrl}
                                                    onChange={(event) =>
                                                        setMenuImageUrl(event.target.value)
                                                    }
                                                    placeholder="https://example.com/dish.jpg"
                                                />
                                            </label>
                                            <label className="production-span-two">
                                                Description
                                                <textarea
                                                    value={menuDescription}
                                                    onChange={(event) =>
                                                        setMenuDescription(
                                                            capitalizeFirstLetter(event.target.value),
                                                        )
                                                    }
                                                    maxLength={2000}
                                                    rows={4}
                                                />
                                            </label>
                                            <label className="production-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={menuVegetarian}
                                                    onChange={(event) =>
                                                        setMenuVegetarian(event.target.checked)
                                                    }
                                                />{" "}
                                                Vegetarian
                                            </label>
                                            <div className="production-form-actions">
                                                <button className="production-button" disabled={saving}>
                                                    {saving
                                                        ? "Saving…"
                                                        : editingMenuItem
                                                            ? "Save changes"
                                                            : "Create menu item"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="production-button production-button-secondary"
                                                    onClick={closeMenuForm}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </Dialog>
                                )}
                                <div className="production-table-wrap menu-management-table-wrap">
                                    <table className="sfh-table menu-management-table">
                                        <thead>
                                            <tr>
                                                <th>Image</th>
                                                <th>Menu item</th>
                                                <th>Category</th>
                                                <th>Description</th>
                                                <th>Price</th>
                                                <th>Order</th>
                                                <th>Recipe</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleMenuItems.map((item) => {
                                                const hasRecipe = recipes.some(
                                                    (recipe) => recipe.menuItem?.id === item.id,
                                                );
                                                return (
                                                    <tr key={item.id}>
                                                        <td>
                                                            {item.imageUrl ? (
                                                                <img
                                                                    src={item.imageUrl}
                                                                    alt={`${item.name} menu item`}
                                                                    onError={(event) => {
                                                                        event.currentTarget.hidden = true;
                                                                    }}
                                                                    style={{
                                                                        width: 48,
                                                                        height: 48,
                                                                        borderRadius: 8,
                                                                        objectFit: "cover",
                                                                    }}
                                                                />
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className="menu-item-name">
                                                                {item.name}
                                                            </span>
                                                            <span className="menu-item-meta">
                                                                Code: {item.itemCode} ·{" "}

                                                            </span>
                                                            <p style={{ margin: 0, fontSize: "10px", color: "var(--color-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                                                Diet: <img
                                                                    src={item.isVegetarian ? "/images/veg.png" : "/images/nonveg.png"}
                                                                    alt=""
                                                                    aria-hidden="true"
                                                                    style={{ width: 14, height: 14, objectFit: "contain" }}
                                                                />
                                                            </p>
                                                        </td>
                                                        <td>{item.category}</td>
                                                        <td>
                                                            <MenuDescription description={item.description} />
                                                        </td>
                                                        <td>{moneyText(item.price)}</td>
                                                        <td>{item.displayOrder}</td>
                                                        <td>
                                                            <span
                                                                className={
                                                                    hasRecipe ? "menu-recipe-linked" : ""
                                                                }
                                                            >
                                                                {hasRecipe ? "Recipe linked" : "No recipe yet"}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={`production-status ${item.isActive ? "status-active" : "status-inactive"}`}
                                                            >
                                                                {item.isActive ? "Active" : "Inactive"}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="menu-management-actions">
                                                                {canManage && (
                                                                    <>
                                                                        <AppTooltip title={`Edit ${item.name}`}>
                                                                            <button
                                                                                type="button"
                                                                                aria-label={`Edit ${item.name}`}
                                                                                onClick={() => startEditMenuItem(item)}
                                                                                disabled={saving}
                                                                            >
                                                                                <Icon name="edit" size={14} />
                                                                            </button>
                                                                        </AppTooltip>
                                                                        <AppTooltip
                                                                            title={
                                                                                item.isActive
                                                                                    ? `Deactivate ${item.name}`
                                                                                    : `Activate ${item.name}`
                                                                            }
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                aria-label={`${item.isActive ? "Deactivate" : "Activate"} ${item.name}`}
                                                                                aria-pressed={item.isActive}
                                                                                onClick={() =>
                                                                                    void toggleMenuItem(item)
                                                                                }
                                                                                disabled={saving}
                                                                            >
                                                                                <Icon
                                                                                    name={
                                                                                        item.isActive
                                                                                            ? "deactivate"
                                                                                            : "activate"
                                                                                    }
                                                                                    size={14}
                                                                                />
                                                                            </button>
                                                                        </AppTooltip>
                                                                        <AppTooltip title={`Delete ${item.name}`}>
                                                                            <button
                                                                                className="menu-management-danger"
                                                                                type="button"
                                                                                aria-label={`Delete ${item.name}`}
                                                                                onClick={() => removeMenuItem(item)}
                                                                                disabled={saving}
                                                                            >
                                                                                <Icon name="delete" size={14} />
                                                                            </button>
                                                                        </AppTooltip>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {menuItems.length === 0 && (
                                                <tr>
                                                    <td colSpan={11}>
                                                        <div className="production-empty production-menu-empty">
                                                            Add your menu items to start building recipes.
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {menuItems.length > 0 && (
                                    <TablePagination
                                        page={currentMenuPage}
                                        pageCount={Math.max(menuPageCount, 1)}
                                        alwaysShow
                                        label={`${menuItems.length} menu items`}
                                        onPageChange={setMenuPage}
                                    />
                                )}
                            </section>
                        )}

                        {tab === "categories" && (
                            <section className="production-panel">
                                <div className="production-panel-heading">
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-start" }}>
                                        <h2>Menu categories</h2>
                                        <p>
                                            Organize dishes into a consistent menu. Linked categories
                                            are deactivated rather than removed.
                                        </p>
                                    </div>
                                    {canManage && (
                                        <button
                                            className="production-button"
                                            onClick={startNewCategory}
                                        >
                                            Add category
                                        </button>
                                    )}
                                </div>
                                {categoryError && (
                                    <AutoDismissMessage
                                        message={categoryError}
                                        onDismiss={() => setCategoryError("")}
                                    >
                                        <div
                                            className="production-alert production-alert-error"
                                            role="alert"
                                        >
                                            {categoryError}
                                        </div>
                                    </AutoDismissMessage>
                                )}
                                {showCategoryForm && (
                                    <Dialog
                                        open
                                        fullWidth
                                        maxWidth="sm"
                                        className="sfh-form-dialog"
                                        onClose={closeCategoryForm}
                                        aria-labelledby="menu-category-form-title"
                                        aria-describedby="menu-category-form-description"
                                    >
                                        <form
                                            className="production-form production-dialog-form sfh-dialog-form"
                                            onSubmit={submitCategory}
                                        >
                                            <div className="production-form-title">
                                                <div>
                                                    <h3 id="menu-category-form-title">
                                                        {editingCategory
                                                            ? "Edit menu category"
                                                            : "New menu category"}
                                                    </h3>
                                                    <p id="menu-category-form-description">
                                                        Leave display order blank to assign the next
                                                        available position.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="production-modal-close"
                                                    onClick={closeCategoryForm}
                                                    aria-label="Close dialog"
                                                >
                                                    <Icon name="close" size={18} />
                                                </button>
                                            </div>
                                            {categoryError && (
                                                <AutoDismissMessage
                                                    message={categoryError}
                                                    onDismiss={() => setCategoryError("")}
                                                >
                                                    <div
                                                        className="production-alert production-alert-error production-span-two"
                                                        role="alert"
                                                    >
                                                        {categoryError}
                                                    </div>
                                                </AutoDismissMessage>
                                            )}
                                            <label>
                                                Category name
                                                <input
                                                    value={categoryName}
                                                    onChange={(event) =>
                                                        setCategoryName(
                                                            capitalizeFirstLetter(event.target.value),
                                                        )
                                                    }
                                                    required
                                                    maxLength={80}
                                                />
                                            </label>
                                            <label>
                                                Display order
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={categoryDisplayOrder}
                                                    onChange={(event) =>
                                                        setCategoryDisplayOrder(event.target.value)
                                                    }
                                                    placeholder="Automatic"
                                                />
                                            </label>
                                            <label className="production-span-two">
                                                Description
                                                <textarea
                                                    value={categoryDescription}
                                                    onChange={(event) =>
                                                        setCategoryDescription(
                                                            capitalizeFirstLetter(event.target.value),
                                                        )
                                                    }
                                                    maxLength={255}
                                                    rows={2}
                                                />
                                            </label>
                                            <label className="production-span-two">
                                                Image URL (optional)
                                                <input
                                                    type="url"
                                                    maxLength={2048}
                                                    value={categoryImageUrl}
                                                    onChange={(event) =>
                                                        setCategoryImageUrl(event.target.value)
                                                    }
                                                />
                                            </label>
                                            {editingCategory && (
                                                <label className="production-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={categoryIsActive}
                                                        onChange={(event) =>
                                                            setCategoryIsActive(event.target.checked)
                                                        }
                                                    />{" "}
                                                    Active
                                                </label>
                                            )}
                                            <div className="production-form-actions">
                                                <button className="production-button" disabled={saving}>
                                                    {saving
                                                        ? "Saving…"
                                                        : editingCategory
                                                            ? "Save changes"
                                                            : "Create category"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="production-button production-button-secondary"
                                                    onClick={closeCategoryForm}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </Dialog>
                                )}
                                <form
                                    className="menu-category-toolbar"
                                    onSubmit={submitCategorySearch}
                                >
                                    <label className="menu-category-search">
                                        Search categories
                                        <input
                                            aria-label="Search menu categories"
                                            value={categorySearchText}
                                            onChange={(event) =>
                                                setCategorySearchText(event.target.value)
                                            }
                                            placeholder="Name or description"
                                        />
                                    </label>
                                    <AppSelect
                                        size="small"
                                        label="Status"
                                        value={categoryStatus}
                                        onChange={(event) => {
                                            setCategoryStatus(
                                                event.target.value as "all" | "active" | "inactive",
                                            );
                                            setCategoryPage(1);
                                            setCategoryLoading(true);
                                            setCategoryError("");
                                        }}
                                        options={[
                                            { value: "all", label: "All categories" },
                                            { value: "active", label: "Active" },
                                            { value: "inactive", label: "Inactive" },
                                        ]}
                                    />
                                    <AppButton
                                        className="menu-category-search-button"
                                        variant="contained"
                                        type="submit"
                                    >
                                        Search
                                    </AppButton>
                                    <div
                                        className="menu-category-sort-actions"
                                        role="group"
                                        aria-label="Sort order"
                                    >
                                        <AppTooltip
                                            title={
                                                categoryOrder === "asc"
                                                    ? "Ascending order"
                                                    : "Set ascending order"
                                            }
                                        >
                                            <AppButton
                                                className={`menu-toolbar-icon-button${categoryOrder === "asc" ? " is-active" : ""}`}
                                                variant="outlined"
                                                type="button"
                                                aria-label="Sort ascending"
                                                aria-pressed={categoryOrder === "asc"}
                                                onClick={() => changeCategoryOrder("asc")}
                                            >
                                                <ArrowUp size={15} />
                                            </AppButton>
                                        </AppTooltip>
                                        <AppTooltip
                                            title={
                                                categoryOrder === "desc"
                                                    ? "Descending order"
                                                    : "Set descending order"
                                            }
                                        >
                                            <AppButton
                                                className={`menu-toolbar-icon-button${categoryOrder === "desc" ? " is-active" : ""}`}
                                                variant="outlined"
                                                type="button"
                                                aria-label="Sort descending"
                                                aria-pressed={categoryOrder === "desc"}
                                                onClick={() => changeCategoryOrder("desc")}
                                            >
                                                <ArrowDown size={15} />
                                            </AppButton>
                                        </AppTooltip>
                                    </div>
                                    <AppTooltip title="Reset filters">
                                        <AppButton
                                            className="menu-toolbar-reset-button"
                                            variant="outlined"
                                            type="button"
                                            aria-label="Reset filters"
                                            onClick={resetCategoryFilters}
                                        >
                                            <Icon name="reset" size={14} />
                                        </AppButton>
                                    </AppTooltip>
                                </form>
                                {categoryLoading ? (
                                    <div className="production-empty">
                                        <ApiLoadingIndicator
                                            label="Loading menu categories…"
                                            compact
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="production-table-wrap menu-management-table-wrap">
                                            <table className="sfh-table menu-management-table">
                                                <thead>
                                                    <tr>
                                                        <th>Image</th>
                                                        <th>Category</th>
                                                        <th>Code</th>
                                                        <th>Description</th>
                                                        <th>Menu items</th>
                                                        <th>Display order</th>
                                                        <th>Status</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {categoryRows.map((category) => (
                                                        <tr key={category.id}>
                                                            <td>
                                                                <img
                                                                    src={category.imageUrl || noCategoryImage}
                                                                    alt={
                                                                        category.imageUrl
                                                                            ? `${category.name} category`
                                                                            : "No category image available"
                                                                    }
                                                                    onError={(event) => {
                                                                        event.currentTarget.onerror = null;
                                                                        event.currentTarget.src = noCategoryImage;
                                                                    }}
                                                                    style={{
                                                                        width: 48,
                                                                        height: 48,
                                                                        borderRadius: 8,
                                                                        objectFit: "cover",
                                                                    }}
                                                                />
                                                            </td>
                                                            <td>
                                                                <span className="menu-item-name">
                                                                    {category.name}
                                                                </span>
                                                            </td>
                                                            <td>{category.categoryCode}</td>
                                                            <td>
                                                                <MenuDescription
                                                                    description={category.description}
                                                                />
                                                            </td>
                                                            <td>{category.menuItemCount}</td>
                                                            <td>{category.displayOrder}</td>
                                                            <td>
                                                                <span
                                                                    className={`production-status ${category.isActive ? "status-active" : "status-inactive"}`}
                                                                >
                                                                    {category.isActive ? "Active" : "Inactive"}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div className="menu-management-actions">
                                                                    {canManage && (
                                                                        <>
                                                                            <AppTooltip
                                                                                title={`Edit ${category.name}`}
                                                                            >
                                                                                <button
                                                                                    type="button"
                                                                                    aria-label={`Edit ${category.name}`}
                                                                                    onClick={() =>
                                                                                        void startEditCategory(category)
                                                                                    }
                                                                                    disabled={saving}
                                                                                >
                                                                                    <Icon name="edit" size={14} />
                                                                                </button>
                                                                            </AppTooltip>
                                                                            <AppTooltip
                                                                                title={`${category.isActive ? "Delete" : "Remove"} ${category.name}`}
                                                                            >
                                                                                <button
                                                                                    className="menu-management-danger"
                                                                                    type="button"
                                                                                    aria-label={`${category.isActive ? "Delete" : "Remove"} ${category.name}`}
                                                                                    onClick={() =>
                                                                                        removeMenuCategory(category)
                                                                                    }
                                                                                    disabled={saving}
                                                                                >
                                                                                    <Icon name="delete" size={14} />
                                                                                </button>
                                                                            </AppTooltip>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {categoryRows.length === 0 && (
                                                <div className="production-empty">
                                                    No categories match these filters.
                                                </div>
                                            )}
                                        </div>
                                        <TablePagination
                                            page={categoryPagination.page}
                                            pageCount={Math.max(categoryPagination.totalPages, 1)}
                                            alwaysShow={categoryPagination.total > 0}
                                            label={`${categoryPagination.total} categories`}
                                            onPageChange={(nextPage) => {
                                                if (categoryLoading) return;
                                                setCategoryPage(nextPage);
                                                setCategoryLoading(true);
                                            }}
                                        />
                                    </>
                                )}
                            </section>
                        )}

                        {tab === "recipes" && (
                            <section className="production-panel recipes-library">
                                <div className="production-panel-heading recipes-library-header">
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "flex-start" }} >
                                        <span className="recipes-section-kicker">
                                            <Sparkles size={14} /> YOUR KITCHEN, ORGANIZED
                                        </span>
                                        <h2>Recipe library</h2>
                                        <p>
                                            Every dish, ingredient, and batch detail in one place.
                                        </p>
                                    </div>
                                    {canManage && (
                                        <button
                                            className="production-button recipes-create-button"
                                            onClick={startNewRecipe}
                                            disabled={
                                                activeMenuItems.length === 0 ||
                                                activeStockItems.length === 0
                                            }
                                            title={
                                                activeMenuItems.length === 0
                                                    ? "Add an active menu item before creating a recipe."
                                                    : activeStockItems.length === 0
                                                        ? "Add active stock items before creating a recipe."
                                                        : undefined
                                            }
                                        >
                                            <Icon name="add" size={16} /> Create recipe
                                        </button>
                                    )}
                                </div>
                                <div className="recipe-overview-grid">
                                    <article className="recipe-overview-card recipes-stat-card">
                                        <span className="recipes-stat-icon"><ChefHat size={18} /></span>
                                        <div>
                                            <span>Active recipes</span>
                                            <strong>{recipes.filter((recipe) => !recipe.isArchived).length}</strong>
                                            <small>Available for production</small>
                                        </div>
                                    </article>
                                    <article className="recipe-overview-card recipes-stat-card">
                                        <span className="recipes-stat-icon"><Utensils size={18} /></span>
                                        <div>
                                            <span>Menu items</span>
                                            <strong>{activeMenuItems.length}</strong>
                                            <small>Active dishes to connect</small>
                                        </div>
                                    </article>
                                    <article className="recipe-overview-card recipes-stat-card">
                                        <span className="recipes-stat-icon"><Package size={18} /></span>
                                        <div>
                                            <span>Stock ingredients</span>
                                            <strong>{activeStockItems.length}</strong>
                                            <small>Active items available to use</small>
                                        </div>
                                    </article>
                                    <article className="recipe-overview-card recipes-stat-card">
                                        <span className="recipes-stat-icon"><Archive size={18} /></span>
                                        <div>
                                            <span>Archived recipes</span>
                                            <strong>{recipes.filter((recipe) => recipe.isArchived).length}</strong>
                                            <small>Previous recipes kept on file</small>
                                        </div>
                                    </article>
                                </div>
                                {(activeMenuItems.length === 0 || activeStockItems.length === 0) && (
                                    <div className="recipe-prerequisite-alert recipes-prerequisite-alert" role="status">
                                        <span className="recipes-prerequisite-icon"><ChefHat size={20} /></span>
                                        <div>
                                            <strong>Set up your recipe inputs first</strong>
                                            <p>
                                                Add an active menu item and stock ingredient to start creating recipes.
                                            </p>
                                        </div>
                                        {activeMenuItems.length === 0 && (
                                            <Link to={routes.menuManagement} className="production-text-button">
                                                Manage menu items
                                            </Link>
                                        )}
                                        {activeStockItems.length === 0 && user.role === "admin" && (
                                            <Link to={routes.stockManagement} className="production-text-button">
                                                Manage stock
                                            </Link>
                                        )}
                                        {activeStockItems.length === 0 && user.role !== "admin" && (
                                            <span className="recipe-prerequisite-note">
                                                Ask an administrator to add active stock items.
                                            </span>
                                        )}
                                    </div>
                                )}
                                <div className="recipe-toolbar recipes-toolbar">
                                    <label className="recipe-search-field">
                                        <span>Search recipes</span>
                                        <span className="recipes-search-input">
                                            <Search size={17} aria-hidden="true" />
                                            <input
                                                type="search"
                                                value={recipeSearch}
                                                onChange={(event) => setRecipeSearch(event.target.value)}
                                                placeholder="Recipe, dish, or ingredient"
                                            />
                                        </span>
                                    </label>
                                    <label className="recipe-filter-field">
                                        Status
                                        <AppSelect
                                            value={recipeStatusFilter}
                                            onChange={(event) =>
                                                setRecipeStatusFilter(
                                                    event.target.value as "all" | "active" | "archived",
                                                )
                                            }
                                            options={[
                                                { value: "all", label: "All recipes" },
                                                { value: "active", label: "Active" },
                                                { value: "archived", label: "Archived" },
                                            ]}
                                        />
                                    </label>
                                    <span className="recipes-result-count">
                                        {visibleRecipes.length} {visibleRecipes.length === 1 ? "recipe" : "recipes"}
                                    </span>
                                </div>
                                {showRecipeForm && (
                                    <Dialog
                                        open
                                        fullWidth
                                        maxWidth="lg"
                                        className="sfh-form-dialog recipes-form-dialog"
                                        onClose={closeRecipeForm}
                                        aria-labelledby="recipe-form-title"
                                        aria-describedby="recipe-form-description"
                                    >
                                        <form
                                            className="production-form production-dialog-form sfh-dialog-form recipes-form"
                                            onSubmit={submitRecipe}
                                        >
                                            <div className="production-form-title recipes-form-title">
                                                <div className="recipes-form-title-content">
                                                    <span className="recipes-form-title-icon"><ChefHat size={22} /></span>
                                                    <div className="recipes-form-title-copy">
                                                        <span className="recipes-form-kicker">
                                                            {editingRecipe ? "RECIPE VERSION" : "NEW RECIPE"}
                                                        </span>
                                                        <h3 id="recipe-form-title">
                                                            {editingRecipe
                                                                ? `Update ${editingRecipe.name}`
                                                                : "Create a recipe"}
                                                        </h3>
                                                        <p id="recipe-form-description">
                                                            Define the batch, map your ingredients, and add the steps.
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="production-modal-close"
                                                    onClick={closeRecipeForm}
                                                    aria-label="Close dialog"
                                                >
                                                    <Icon name="close" size={18} />
                                                </button>
                                            </div>
                                            <div className="recipe-flow-steps recipes-setup-steps production-span-two" style={{ marginTop: '20px' }}>
                                                <span className="is-current"><b>01</b> Dish &amp; batch</span>
                                                <span><b>02</b> Ingredients</span>
                                                <span><b>03</b> Preparation</span>
                                            </div>
                                            {error && (
                                                <AutoDismissMessage
                                                    message={error}
                                                    onDismiss={() => setError("")}
                                                >
                                                    <div
                                                        className="production-alert production-alert-error production-span-two"
                                                        role="alert"
                                                    >
                                                        {error}
                                                    </div>
                                                </AutoDismissMessage>
                                            )}
                                            {!editingRecipe && (
                                                <>
                                                    <div className="recipes-form-section-heading production-span-two">
                                                        <span>01</span>
                                                        <div>
                                                            <h4>Choose your dish</h4>
                                                            <p>Link this recipe to an active menu item.</p>
                                                        </div>
                                                    </div>
                                                    <label>
                                                        Menu item
                                                        <AppSelect
                                                            value={recipeMenuItemId}
                                                            displayEmpty
                                                            onChange={(event) => {
                                                                const menuItem = activeMenuItems.find(
                                                                    (item) => item.id === event.target.value,
                                                                );
                                                                setRecipeMenuItemId(event.target.value);
                                                                setRecipeName(menuItem?.name || "");
                                                            }}
                                                            required
                                                            options={[
                                                                { value: "", label: "Select the menu item" },
                                                                ...activeMenuItems.map((item) => ({
                                                                    value: item.id,
                                                                    label: `${item.name} · ${item.category}`,
                                                                })),
                                                            ]}
                                                        />
                                                    </label>
                                                    <label>
                                                        Recipe name
                                                        <input
                                                            value={recipeName}
                                                            onChange={(event) =>
                                                                setRecipeName(
                                                                    capitalizeFirstLetter(event.target.value),
                                                                )
                                                            }
                                                            required
                                                            maxLength={120}
                                                        />
                                                    </label>
                                                    {selectedRecipeMenuItem && (
                                                        <div className="recipe-menu-summary production-span-two">
                                                            <div>
                                                                <span className="recipe-summary-eyebrow">
                                                                    LINKED MENU ITEM
                                                                </span>
                                                                <strong>{selectedRecipeMenuItem.name}</strong>
                                                                <small>
                                                                    {selectedRecipeMenuItem.itemCode} ·{" "}
                                                                    {selectedRecipeMenuItem.category}
                                                                </small>
                                                            </div>
                                                            <div className="recipe-menu-summary-side">
                                                                <span>
                                                                    {selectedRecipeMenuItem.isVegetarian
                                                                        ? "Vegetarian"
                                                                        : "Non-vegetarian"}
                                                                </span>
                                                                <strong>
                                                                    {moneyText(selectedRecipeMenuItem.price)}
                                                                </strong>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <div className="recipes-form-section-heading production-span-two">
                                                <span>{editingRecipe ? "01" : "02"}</span>
                                                <div>
                                                    <h4>Batch and yield</h4>
                                                    <p>Set the quantity and expected servings for one batch.</p>
                                                </div>
                                            </div>
                                            <label>
                                                Base batch quantity
                                                <input
                                                    type="number"
                                                    min="0.001"
                                                    step="0.001"
                                                    value={baseQuantity}
                                                    onChange={(event) =>
                                                        setBaseQuantity(event.target.value)
                                                    }
                                                    required
                                                />
                                            </label>
                                            <label>
                                                Batch unit{" "}
                                                <AppSelect
                                                    value={baseUnit}
                                                    onChange={(event) => setBaseUnit(event.target.value)}
                                                    options={UNIT_OPTIONS.map((unit) => ({
                                                        value: unit,
                                                        label: unit,
                                                    }))}
                                                />
                                            </label>
                                            <label>
                                                Expected plates
                                                <input
                                                    type="number"
                                                    min="0.001"
                                                    step="0.001"
                                                    value={expectedPlates}
                                                    onChange={(event) =>
                                                        setExpectedPlates(event.target.value)
                                                    }
                                                    required
                                                />
                                            </label>
                                            <label>
                                                Recipe wastage %
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    value={recipeWastage}
                                                    onChange={(event) =>
                                                        setRecipeWastage(event.target.value)
                                                    }
                                                />
                                            </label>
                                            <label>
                                                Cooking time (minutes)
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={cookingMinutes}
                                                    onChange={(event) =>
                                                        setCookingMinutes(event.target.value)
                                                    }
                                                />
                                            </label>
                                            <label className="production-span-two recipes-instructions-label">
                                                <span className="recipes-form-section-heading-inline">
                                                    <span>{editingRecipe ? "02" : "03"}</span>
                                                    <span>
                                                        <strong>Preparation instructions</strong>
                                                        <small>Add a clear step-by-step method for your kitchen team.</small>
                                                    </span>
                                                </span>
                                                <textarea
                                                    value={instructions}
                                                    onChange={(event) =>
                                                        setInstructions(
                                                            capitalizeFirstLetter(event.target.value),
                                                        )
                                                    }
                                                    rows={3}
                                                    maxLength={10000}
                                                />
                                            </label>
                                            <div className="production-ingredient-editor recipes-ingredient-section production-span-two">
                                                <div className="production-subheading recipes-ingredient-heading">
                                                    <div>
                                                        <span className="recipes-form-section-number">
                                                            {editingRecipe ? "03" : "04"}
                                                        </span>
                                                        <div>
                                                            <h4>Stock ingredients</h4>
                                                            <p>
                                                                Choose inventory items and set the quantity used in one batch.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="production-text-button recipes-add-ingredient"
                                                        onClick={() =>
                                                            setIngredients((rows) => [
                                                                emptyIngredient(),
                                                                ...rows,
                                                            ])
                                                        }
                                                    >
                                                        <Icon name="add" size={15} /> Add ingredient
                                                    </button>
                                                </div>
                                                {ingredients.map((ingredient, index) => {
                                                    const selectedStockItem = activeStockItems.find(
                                                        (item) => item.id === ingredient.stockItemId,
                                                    );
                                                    const unitOptions = Array.from(
                                                        new Set([
                                                            ...UNIT_OPTIONS,
                                                            ...(ingredient.unit ? [ingredient.unit] : []),
                                                        ]),
                                                    );
                                                    return (
                                                        <div
                                                            className="production-ingredient-row recipes-ingredient-row"
                                                            key={`ingredient-${index}`}
                                                        >
                                                            <label>
                                                                Stock item
                                                                <AppSelect
                                                                    value={ingredient.stockItemId}
                                                                    required
                                                                    displayEmpty
                                                                    onChange={(event) => {
                                                                        const selected = activeStockItems.find(
                                                                            (item) => item.id === event.target.value,
                                                                        );
                                                                        setIngredients((rows) =>
                                                                            rows.map((row, rowIndex) =>
                                                                                rowIndex === index
                                                                                    ? {
                                                                                        ...row,
                                                                                        stockItemId: event.target.value,
                                                                                        unit: selected?.unit || "",
                                                                                    }
                                                                                    : row,
                                                                            ),
                                                                        );
                                                                    }}
                                                                    options={[
                                                                        { value: "", label: "Select stock item" },
                                                                        ...activeStockItems.map((item) => ({
                                                                            value: item.id,
                                                                            label: `${item.name} · ${quantityText(item.quantity, item.unit)} available`,
                                                                        })),
                                                                    ]}
                                                                />
                                                                {selectedStockItem && (
                                                                    <small className="recipe-stock-hint">
                                                                        Available{" "}
                                                                        <strong>
                                                                            {quantityText(
                                                                                selectedStockItem.quantity,
                                                                                selectedStockItem.unit,
                                                                            )}
                                                                        </strong>{" "}
                                                                        · Reorder at{" "}
                                                                        {quantityText(
                                                                            selectedStockItem.reorderLevel,
                                                                            selectedStockItem.unit,
                                                                        )}
                                                                        {asNumber(selectedStockItem.quantity) <=
                                                                            asNumber(selectedStockItem.reorderLevel) && (
                                                                                <span className="recipe-stock-low">
                                                                                    Low stock
                                                                                </span>
                                                                            )}
                                                                    </small>
                                                                )}
                                                            </label>
                                                            <label>
                                                                Quantity
                                                                <input
                                                                    type="number"
                                                                    min="0.001"
                                                                    step="0.001"
                                                                    value={ingredient.quantity}
                                                                    required
                                                                    onChange={(event) =>
                                                                        setIngredients((rows) =>
                                                                            rows.map((row, rowIndex) =>
                                                                                rowIndex === index
                                                                                    ? {
                                                                                        ...row,
                                                                                        quantity: event.target.value,
                                                                                    }
                                                                                    : row,
                                                                            ),
                                                                        )
                                                                    }
                                                                />
                                                            </label>
                                                            <label>
                                                                Recipe unit
                                                                <AppSelect
                                                                    value={ingredient.unit}
                                                                    required
                                                                    displayEmpty
                                                                    onChange={(event) =>
                                                                        setIngredients((rows) =>
                                                                            rows.map((row, rowIndex) =>
                                                                                rowIndex === index
                                                                                    ? { ...row, unit: event.target.value }
                                                                                    : row,
                                                                            ),
                                                                        )
                                                                    }
                                                                    options={[
                                                                        { value: "", label: "Select unit" },
                                                                        ...unitOptions.map((unit) => ({
                                                                            value: unit,
                                                                            label: unit,
                                                                        })),
                                                                    ]}
                                                                />
                                                            </label>
                                                            <label>
                                                                Wastage %
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.01"
                                                                    value={ingredient.wastagePercentage}
                                                                    onChange={(event) =>
                                                                        setIngredients((rows) =>
                                                                            rows.map((row, rowIndex) =>
                                                                                rowIndex === index
                                                                                    ? {
                                                                                        ...row,
                                                                                        wastagePercentage:
                                                                                            event.target.value,
                                                                                    }
                                                                                    : row,
                                                                            ),
                                                                        )
                                                                    }
                                                                />
                                                            </label>
                                                            <label className="production-span-two">
                                                                Preparation note
                                                                <input
                                                                    value={ingredient.preparationNotes}
                                                                    maxLength={255}
                                                                    onChange={(event) =>
                                                                        setIngredients((rows) =>
                                                                            rows.map((row, rowIndex) =>
                                                                                rowIndex === index
                                                                                    ? {
                                                                                        ...row,
                                                                                        preparationNotes:
                                                                                            capitalizeFirstLetter(
                                                                                                event.target.value,
                                                                                            ),
                                                                                    }
                                                                                    : row,
                                                                            ),
                                                                        )
                                                                    }
                                                                />
                                                            </label>
                                                            {ingredients.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    className="production-text-button production-remove recipes-remove-ingredient"
                                                                    onClick={() =>
                                                                        setIngredients((rows) =>
                                                                            rows.filter(
                                                                                (_, rowIndex) => rowIndex !== index,
                                                                            ),
                                                                        )
                                                                    }
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="production-form-actions recipes-form-actions production-span-two">
                                                <button className="production-button" disabled={saving}>
                                                    {saving
                                                        ? "Saving…"
                                                        : editingRecipe
                                                            ? "Save new version"
                                                            : "Create recipe"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="production-button production-button-secondary"
                                                    onClick={closeRecipeForm}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </Dialog>
                                )}
                                <div className="production-recipe-grid">
                                    {visibleRecipes.map((recipe) => (
                                        <article
                                            className={`production-recipe-card recipes-card${recipe.isArchived ? " is-archived" : ""}`}
                                            key={recipe.id}
                                        >
                                            <div className="recipes-card-cover">
                                                {recipe.menuItem?.imageUrl ? (
                                                    <img
                                                        src={recipe.menuItem.imageUrl}
                                                        alt=""
                                                        onError={(event) => {
                                                            event.currentTarget.hidden = true;
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="recipes-card-cover-placeholder">
                                                        <ChefHat size={34} />
                                                    </div>
                                                )}
                                                <span
                                                    className={`production-status recipes-card-status ${recipe.isArchived ? "status-inactive" : "status-active"}`}
                                                >
                                                    {recipe.isArchived
                                                        ? "Archived"
                                                        : `Version ${recipe.currentVersion}`}
                                                </span>
                                                <div className="recipes-card-cover-caption">
                                                    <span>{recipe.menuItem?.category || "Menu recipe"}</span>
                                                    <h3>{recipe.name}</h3>
                                                    <small>
                                                        <Utensils size={13} />
                                                        {recipe.menuItem?.name || "Menu item unavailable"}
                                                    </small>
                                                </div>
                                            </div>
                                            <div className="recipes-card-content">
                                                {recipe.current && (
                                                    <div className="recipes-card-metrics">
                                                        <span>
                                                            <Package size={14} />
                                                            {quantityText(
                                                                recipe.current.baseProductionQuantity,
                                                                recipe.current.baseProductionUnit,
                                                            )}
                                                        </span>
                                                        <span>
                                                            <Utensils size={14} />
                                                            {quantityText(
                                                                recipe.current.expectedPlateCount,
                                                                "plates",
                                                            )}
                                                        </span>
                                                        <span>
                                                            <Leaf size={14} />
                                                            {recipe.current.ingredients?.length || 0} ingredients
                                                        </span>
                                                        {recipe.current.cookingTimeMinutes !== null && (
                                                            <span>
                                                                <Clock3 size={14} />
                                                                {recipe.current.cookingTimeMinutes} min
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="production-card-actions recipes-card-actions">
                                                    <AppTooltip title={`View ${recipe.name}`}>
                                                        <button
                                                            type="button"
                                                            className="recipes-icon-action"
                                                            aria-label={`View ${recipe.name}`}
                                                            onClick={() => setSelectedRecipe(recipe)}
                                                        >
                                                            <Icon name="view" size={14} />
                                                        </button>
                                                    </AppTooltip>
                                                    {canManage && !recipe.isArchived && (
                                                        <AppTooltip title={`Edit ${recipe.name}`}>
                                                            <button
                                                                type="button"
                                                                className="recipes-icon-action"
                                                                aria-label={`Edit ${recipe.name}`}
                                                                onClick={() => startNewVersion(recipe)}
                                                                disabled={!recipe.current}
                                                            >
                                                                <Icon name="edit" size={14} />
                                                            </button>
                                                        </AppTooltip>
                                                    )}
                                                    {canManage && (
                                                        <AppTooltip title={`${recipe.isArchived ? "Restore" : "Archive"} ${recipe.name}`}>
                                                            <button
                                                                type="button"
                                                                className={`recipes-icon-action${recipe.isArchived ? "" : " recipes-icon-action-archive"}`}
                                                                aria-label={`${recipe.isArchived ? "Restore" : "Archive"} ${recipe.name}`}
                                                                onClick={() => void toggleRecipe(recipe)}
                                                                disabled={saving}
                                                            >
                                                                <Icon
                                                                    name={
                                                                        recipe.isArchived ? "activate" : "deactivate"
                                                                    }
                                                                    size={14}
                                                                />
                                                            </button>
                                                        </AppTooltip>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                                {visibleRecipes.length === 0 && !showRecipeForm && (
                                    <div className="recipe-empty-state recipes-empty-state">
                                        {recipes.length === 0 ? (
                                            <>
                                                <span className="recipe-empty-mark">R</span>
                                                <h3>Build your first recipe</h3>
                                                <p>
                                                    Choose a menu item, then map its ingredients to stock
                                                    quantities and batch yield.
                                                </p>
                                                {canManage &&
                                                    activeMenuItems.length > 0 &&
                                                    activeStockItems.length > 0 && (
                                                        <button
                                                            className="production-button"
                                                            onClick={startNewRecipe}
                                                        >
                                                            <Icon name="add" size={16} /> Create first recipe
                                                        </button>
                                                    )}
                                            </>
                                        ) : (
                                            <>
                                                <h3>No recipes match these filters</h3>
                                                <p>Try a different search or show all recipe statuses.</p>
                                                <button
                                                    className="production-text-button"
                                                    onClick={() => {
                                                        setRecipeSearch("");
                                                        setRecipeStatusFilter("all");
                                                    }}
                                                >
                                                    Clear filters
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </section>
                        )}
                    </>
                )}
            </div>

            {selectedRecipe && (
                <Dialog
                    open
                    fullWidth
                    maxWidth="lg"
                    className="production-detail-dialog recipes-detail-dialog"
                    onClose={() => setSelectedRecipe(null)}
                    aria-labelledby="recipe-detail-title"
                >
                    <section className="production-recipe-detail recipes-detail">
                        <div className="production-modal-heading recipes-detail-heading">
                            <div className="recipes-detail-title">
                                <p className="eyebrow">
                                    <Sparkles size={13} /> RECIPE DETAILS
                                </p>
                                <h2 id="recipe-detail-title">{selectedRecipe.name}</h2>
                                <p className="production-recipe-menu">
                                    For {selectedRecipe.menuItem?.name || "Menu item unavailable"}
                                </p>
                                <span className={`recipes-detail-version${selectedRecipe.isArchived ? " is-archived" : ""}`}>
                                    {selectedRecipe.isArchived ? "Archived" : "Active"}
                                    <span>·</span>
                                    Version {selectedRecipe.currentVersion}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="production-modal-close"
                                onClick={() => setSelectedRecipe(null)}
                                aria-label="Close recipe details"
                            >
                                <Icon name="close" size={18} />
                            </button>
                        </div>
                        {selectedRecipe.menuItem && (
                            <div className="recipe-detail-menu-card recipes-detail-dish">
                                {selectedRecipe.menuItem.imageUrl ? (
                                    <img
                                        src={selectedRecipe.menuItem.imageUrl}
                                        alt=""
                                        onError={(event) => {
                                            event.currentTarget.hidden = true;
                                        }}
                                    />
                                ) : (
                                    <div className="recipe-detail-menu-placeholder" aria-hidden="true">
                                        {selectedRecipe.menuItem.name.slice(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <span className="recipe-summary-eyebrow">LINKED MENU ITEM</span>
                                    <strong>{selectedRecipe.menuItem.name}</strong>
                                    <small>
                                        {selectedRecipe.menuItem.itemCode} ·{" "}
                                        {selectedRecipe.menuItem.category}
                                    </small>
                                </div>
                                <div className="recipe-detail-menu-aside">
                                    <span className={selectedRecipe.menuItem.isVegetarian ? "recipes-diet-badge is-vegetarian" : "recipes-diet-badge"}>
                                        {selectedRecipe.menuItem.isVegetarian && <Leaf size={13} />}
                                        {selectedRecipe.menuItem.isVegetarian
                                            ? "Vegetarian"
                                            : "Non-vegetarian"}
                                    </span>
                                    <strong>{moneyText(selectedRecipe.menuItem.price)}</strong>
                                </div>
                            </div>
                        )}
                        {selectedRecipe.current ? (
                            <>
                                <div className="recipe-detail-stats recipes-detail-stats">
                                    <div>
                                        <span><Package size={15} /> Batch size</span>
                                        <strong>
                                            {quantityText(
                                                selectedRecipe.current.baseProductionQuantity,
                                                selectedRecipe.current.baseProductionUnit,
                                            )}
                                        </strong>
                                    </div>
                                    <div>
                                        <span><Utensils size={15} /> Expected yield</span>
                                        <strong>
                                            {quantityText(
                                                selectedRecipe.current.expectedPlateCount,
                                                "plates",
                                            )}
                                        </strong>
                                    </div>
                                    <div>
                                        <span><Clock3 size={15} /> Cooking time</span>
                                        <strong>
                                            {selectedRecipe.current.cookingTimeMinutes === null
                                                ? "Not set"
                                                : `${selectedRecipe.current.cookingTimeMinutes} min`}
                                        </strong>
                                    </div>
                                    <div>
                                        <span><Leaf size={15} /> Recipe wastage</span>
                                        <strong>
                                            {quantityText(
                                                selectedRecipe.current.wastagePercentage,
                                                "%",
                                            )}
                                        </strong>
                                    </div>
                                </div>
                                <section className="recipe-detail-section recipes-detail-section">
                                    <div className="recipe-detail-section-heading recipes-detail-section-heading">
                                        <div>
                                            <span className="recipes-detail-section-label">IN THIS RECIPE</span>
                                            <h3>Ingredients</h3>
                                            <p>
                                                {selectedRecipe.current.ingredients.length} ingredients
                                                linked to inventory
                                            </p>
                                        </div>
                                    </div>
                                    <div className="recipe-detail-ingredients">
                                        {selectedRecipe.current.ingredients.map(
                                            (ingredient, index) => {
                                                const stockItem = stockItems.find(
                                                    (item) => item.id === ingredient.stockItemId,
                                                );
                                                const availableQuantity = stockItem
                                                    ? asNumber(stockItem.quantity)
                                                    : null;
                                                const isLowStock =
                                                    stockItem !== undefined &&
                                                    availableQuantity !== null &&
                                                    availableQuantity <=
                                                    asNumber(stockItem.reorderLevel);
                                                return (
                                                    <article
                                                        className="recipe-detail-ingredient recipes-detail-ingredient"
                                                        key={`${ingredient.stockItemId}-${index}`}
                                                    >
                                                        <div className="recipe-detail-ingredient-main">
                                                            <strong>
                                                                {stockItem?.name ||
                                                                    ingredient.stockItem?.name ||
                                                                    "Stock item unavailable"}
                                                            </strong>
                                                            <small>
                                                                {stockItem
                                                                    ? `${stockItem.itemCode} · ${quantityText(stockItem.quantity, stockItem.unit)} available`
                                                                    : "This stock item is no longer available"}
                                                            </small>
                                                            {ingredient.preparationNotes && (
                                                                <small className="recipe-ingredient-note">
                                                                    {ingredient.preparationNotes}
                                                                </small>
                                                            )}
                                                        </div>
                                                        <div className="recipe-detail-ingredient-amount">
                                                            <strong>
                                                                {quantityText(
                                                                    ingredient.quantity,
                                                                    ingredient.unit,
                                                                )}
                                                            </strong>
                                                            <small>
                                                                {asNumber(ingredient.wastagePercentage)}%
                                                                wastage
                                                            </small>
                                                            {isLowStock && (
                                                                <span className="recipe-stock-low">
                                                                    Low stock
                                                                </span>
                                                            )}
                                                        </div>
                                                    </article>
                                                );
                                            },
                                        )}
                                    </div>
                                </section>
                                {selectedRecipe.current.preparationInstructions && (
                                    <section className="recipe-detail-section recipes-detail-section recipes-instructions-section">
                                        <span className="recipes-detail-section-label">THE METHOD</span>
                                        <h3>Preparation</h3>
                                        <p className="recipe-detail-instructions">
                                            {selectedRecipe.current.preparationInstructions}
                                        </p>
                                    </section>
                                )}
                            </>
                        ) : (
                            <div className="recipe-detail-empty">
                                No current version is available for this recipe.
                            </div>
                        )}
                        <div className="recipe-detail-actions recipes-detail-actions">
                            {canManage &&
                                !selectedRecipe.isArchived &&
                                selectedRecipe.current && (
                                    <button
                                        type="button"
                                        className="production-button"
                                        onClick={() => {
                                            const recipe = selectedRecipe;
                                            setSelectedRecipe(null);
                                            startNewVersion(recipe);
                                        }}
                                    >
                                        <Icon name="edit" size={14} /> Create new version
                                    </button>
                                )}
                            {!selectedRecipe.isArchived && (
                                <Link
                                    className="recipe-production-link"
                                    to={routes.dailyProduction}
                                >
                                    Continue to production
                                </Link>
                            )}
                        </div>
                    </section>
                </Dialog>
            )}

            {selectedMenuItem && (
                <Dialog
                    open
                    fullWidth
                    maxWidth="sm"
                    className="production-detail-dialog"
                    onClose={() => setSelectedMenuItem(null)}
                    aria-labelledby="menu-item-detail-title"
                >
                    <section className="production-menu-detail">
                        <div className="production-modal-heading">
                            <div>
                                <p className="eyebrow">MENU ITEM</p>
                                <h2 id="menu-item-detail-title">{selectedMenuItem.name}</h2>
                            </div>
                            <button
                                type="button"
                                className="production-modal-close"
                                onClick={() => setSelectedMenuItem(null)}
                                aria-label="Close details"
                            >
                                <Icon name="close" size={18} />
                            </button>
                        </div>
                        {selectedMenuItem.imageUrl && (
                            <img
                                className="production-menu-detail-image"
                                src={selectedMenuItem.imageUrl}
                                alt={selectedMenuItem.name}
                                onError={(event) => {
                                    event.currentTarget.hidden = true;
                                }}
                            />
                        )}
                        <div className="production-menu-detail-meta">
                            <span
                                className={`production-status ${selectedMenuItem.isActive ? "status-active" : "status-inactive"}`}
                            >
                                {selectedMenuItem.isActive ? "Active" : "Inactive"}
                            </span>
                            <span>
                                <img
                                    src={
                                        selectedMenuItem.isVegetarian
                                            ? "/images/veg.png"
                                            : "/images/nonveg.png"
                                    }
                                    alt={
                                        selectedMenuItem.isVegetarian
                                            ? "Vegetarian"
                                            : "Non-vegetarian"
                                    }
                                />
                                {selectedMenuItem.isVegetarian
                                    ? "Vegetarian"
                                    : "Non-vegetarian"}
                            </span>
                            <strong>{moneyText(selectedMenuItem.price)}</strong>
                        </div>
                        <p className="production-menu-detail-description">
                            Code: {selectedMenuItem.itemCode} · Display order:{" "}
                            {selectedMenuItem.displayOrder}
                        </p>
                        <p className="production-menu-detail-category">
                            {selectedMenuItem.category}
                        </p>
                        <p className="production-menu-detail-description">
                            {selectedMenuItem.description || "No description provided."}
                        </p>
                        <p className="production-menu-detail-recipe">
                            {recipes.some(
                                (recipe) => recipe.menuItem?.id === selectedMenuItem.id,
                            )
                                ? "A recipe is linked to this menu item."
                                : "No recipe is linked to this menu item yet."}
                        </p>
                    </section>
                </Dialog>
            )}

            {selectedCategory && (
                <Dialog
                    open
                    fullWidth
                    maxWidth="lg"
                    className="production-detail-dialog category-view-dialog"
                    onClose={() => setSelectedCategory(null)}
                    aria-labelledby="menu-category-detail-title"
                >
                    <section className="production-category-detail">
                        <div className="category-view-hero">
                            <img
                                className="category-view-image"
                                src={selectedCategory.imageUrl || noCategoryImage}
                                alt={
                                    selectedCategory.imageUrl
                                        ? `${selectedCategory.name} category`
                                        : "No category image available"
                                }
                                onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src = noCategoryImage;
                                }}
                            />
                            <button
                                type="button"
                                className="category-view-close"
                                onClick={() => setSelectedCategory(null)}
                                aria-label="Close details"
                            >
                                <Icon name="close" size={18} />
                            </button>
                            <div className="category-view-hero-content">
                                <span className="category-view-eyebrow">MENU CATEGORY</span>
                                <h2 id="menu-category-detail-title">
                                    {selectedCategory.name}
                                </h2>
                                <div className="category-view-meta">
                                    <span
                                        className={`category-view-status ${selectedCategory.isActive ? "is-active" : "is-inactive"}`}
                                    >
                                        {selectedCategory.isActive ? "Active" : "Inactive"}
                                    </span>
                                    <span>{selectedCategory.menuItemCount} menu items</span>
                                    <span>Display order {selectedCategory.displayOrder}</span>
                                </div>
                                <span className="category-view-code">
                                    Code: {selectedCategory.categoryCode}
                                </span>
                            </div>
                        </div>
                        <p className="category-view-description">
                            {selectedCategory.description || "No description provided."}
                        </p>
                    </section>
                </Dialog>
            )}

            {confirmation && (
                <ConfirmDialog
                    title={confirmation.title}
                    message={confirmation.message}
                    confirmLabel={confirmation.confirmLabel}
                    icon={confirmation.icon}
                    onCancel={() => setConfirmation(null)}
                    onConfirm={confirmation.onConfirm}
                />
            )}
        </AdminLayout>
    );
}

function MenuDescription({
    description,
}: {
    description: string | null | undefined;
}) {
    if (!description) return <>—</>;

    return (
        <AppTooltip title={description}>
            <span>
                {description.length > 50
                    ? `${description.slice(0, 50)}....`
                    : description}
            </span>
        </AppTooltip>
    );
}
