import { ProductionManagementPage } from "../production/ProductionManagementPage";
import type { AuthUser } from "../../types/auth.types";

export function MenuManagementPage({
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
            view="menu"
        />
    );
}
