# Surya Food Hub Admin

The admin app currently authenticates with `POST /api/auth/login` using
`{ identifier, password }`, then opens the dashboard selected by the returned
user role. It revalidates an existing tab session with `GET /api/auth/me` and
keeps the access token in session storage and allows the browser to retain the refresh
token in the API's httpOnly cookie.
Protected API calls share the stored Bearer token. A `401 Unauthorized` from a
protected request opens a blocking session-expired dialog; choosing **Login**
clears the local authentication state and returns to sign-in. Public login
requests do not trigger this handler.

## Run locally

Start the backend on port `6060`, then run:

```sh
npm install
npm run dev
```

The local `.env` sets `VITE_API_BASE_URL=http://localhost:6060/api`, so the
browser sends API calls directly to the backend (for example
`http://localhost:6060/api/auth/login`). Copy `.env.example` and set
`VITE_API_BASE_URL` to the API base path for another environment. Restart Vite
after changing the environment file. The API must allow the frontend origin
through CORS; the backend's local CORS configuration already allows
`http://localhost:5173`.

The overview is the authenticated landing page. Stock management is available
from the Admin sidebar and uses the Admin-only `/api/admin/stock` endpoints.
Run `migrations/004_stock_management.sql` before using it against a deployed
database; local startup also creates new Sequelize models through sync.

## Project architecture

The app follows the feature-oriented structure under `src/`:

- `app/` owns the root app, providers, and role-aware route definitions.
- `features/auth/`, `features/dashboard/`, and `features/inventory/` own the
  sign-in, overview, and stock management flows.
- `layouts/` contains auth and dashboard shells; `components/` contains shared UI.
- `services/`, `hooks/`, `store/`, and `types/` hold cross-feature behavior and
  contracts.
- `theme/` and `styles/` centralize design tokens, global styles, responsive
  rules, and animations.
- `config/` and `utils/` hold app configuration and shared helpers.

Other domain directories such as `features/orders/` and `features/reports/`
are reserved for later screens as their APIs are added. Keep each domain's pages,
components, and API queries within its feature rather than growing the root app
component.
