import { ProductionManagementPage } from "../production/ProductionManagementPage";
import type { AuthUser } from "../../types/auth.types";
import "./recipes.css";

export function RecipesPage({
    user,
    onLogout,
}: {
    user: AuthUser;
    onLogout: () => void;
}) {
    return (
        <ProductionManagementPage
            user={user}
            onLogout={onLogout}
            view="recipes"
        />
    );
}
