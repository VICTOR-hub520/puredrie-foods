# Puredrie Foods

Puredrie Foods is a Next.js storefront and business-management application for dried fruit and moringa products. It uses PostgreSQL through Prisma.

## Local setup

1. Install Node.js 20.9 or later and PostgreSQL.
2. In Windows PowerShell, install dependencies with `npm.cmd install`.
3. Copy `.env.example` to `.env`. Set a unique `SESSION_SECRET` (at least 32 characters) and choose an administrator email and password (at least 12 characters). Do not share or commit `.env`.
4. Create a dedicated local database role and database by running `npm.cmd run db:setup:local`. Enter the PostgreSQL administrator password when prompted, then choose a new password for `puredrie_app` when asked. This script does not put either password into a file.
5. In `.env`, set `DATABASE_URL` to `postgresql://puredrie_app:<URL-encoded-password>@localhost:5432/puredrie?schema=public`. Replace the placeholder locally; URL-encode special characters in the password.
6. Apply the checked-in PostgreSQL migration with `npm.cmd run db:migrate -- --name init`, then run `npm.cmd run db:seed`.
7. Start the application with `npm.cmd run dev`. The shop is at `/shop`, customer accounts at `/account`, and administrator sign-in at `/admin/login`.

## Brand story and customer information

The public About page and `/our-story` use the editable sections seeded from `prisma/brand-content.json`. Administrators can edit and publish those sections at `/admin/content`; the founder note is unpublished until the business owner supplies its wording. Seeding adds missing sections without replacing saved edits. Public FAQ, privacy, shopping terms, and delivery/returns information are available from the site footer. The privacy and shopping-policy pages identify details that require business-owner review; confirm the legal identity, data-retention arrangements, service areas, and return/refund terms before relying on them as complete legal notices.

The local database script expects the PostgreSQL administrator role to be named `postgres`. If your installation uses a different administrator role, change `-U postgres` in `scripts/setup-local-database.ps1` before running it.

## Open Puredrie from the desktop

After local setup, create a production build and install the Windows shortcuts:

```powershell
npm.cmd run build
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-puredrie-shortcuts.ps1
```

This creates a branded **Puredrie Foods.local** desktop icon and starts a hidden local-server monitor when you sign in to Windows. The desktop icon opens `http://127.0.0.1:3000`; the monitor starts the production app when needed and restarts it if its process exits. PostgreSQL is configured to start automatically with Windows. The app exposes `/api/health` to verify both the site and database connection. Logs are saved under `%LOCALAPPDATA%\Puredrie Foods\logs`.

The local website is available while the computer is powered on and signed in; it cannot run while the PC is shut down or asleep, and it is not publicly available on the internet. Keep the project files, `.env`, PostgreSQL service, and database on this computer. When application code changes, rebuild with `npm.cmd run build` and restart the local app. Do not start `npm.cmd run dev` at the same time as the production app because both use port 3000.

## Business rules

- The catalogue is seeded with the standard sizes and prices specified by the business. Checkout always reads current prices from PostgreSQL; it does not trust browser-submitted prices.
- Delivery is free and scheduled no later than six Nairobi calendar days after the order date, including weekends and public holidays.
- Orders can be placed online or entered by staff from WhatsApp, phone, social media, or in person.
- Payments remain pending until recorded as received. Partial payments are supported. Cheques count as received revenue only after they are marked cleared.
- Customers can register, sign in, update their details, and view only their own order history.
- Administrator and customer passwords are hashed; role and permission records are held in PostgreSQL.
- Admin inventory records distinguish bulk ingredients from finished packages. Stock receipts create traceable batches; corrections and packaging runs are logged as stock movements.
- Packaging consumes the selected bulk balance and increases finished-package stock in one database transaction. Batch and unbatched balances are tracked separately to prevent the same stock being consumed twice.

## Admin operations

Sign in at `/admin/login`. Use Settings to select one of four color themes and light or dark mode. The same appearance controls are available in the storefront footer. Both preferences are saved in the current browser and apply to the storefront and admin pages viewed there. Use the Inventory section to create bulk or finished stock items, receive stock into batches, record count adjustments, set reorder levels, and package bulk ingredients into sale-ready variants. Inventory changes appear in the movement history. The Orders screen supports server-side customer/order search, filters, and pagination; cancellations require a reason and are retained in order history. New-order and delivery-deadline alerts appear in the admin dashboard. Customers with an account receive in-app order-status notifications on their account page; guest orders cannot receive email or SMS alerts until a messaging provider is configured. Orders do not reserve inventory, so cancellation does not adjust stock. Supplier purchasing, returns and replacements, and staff-permission management are not yet available as admin screens.

The Products screen lets administrators maintain descriptions, prices, and optional ingredient, nutrition, allergen, storage, and country-of-origin information. Enter only details verified against product labels or business records; these fields remain unpublished until explicitly enabled for the product.

The public homepage uses Pexels photographs of assorted dried fruit and dried pineapple, plus a close-up of dried mango slices by [RoyBuri on Pixabay](https://pixabay.com/photos/mango-getroknet-fruit-yummy-3386353/). The Pexels photographs in `public/images/` are used under the [Pexels License](https://www.pexels.com/license/); the mango photo is available under the [Pixabay Content License](https://pixabay.com/service/license-summary/). Credits: [assorted dried fruit, by Breakingpic](https://www.pexels.com/photo/dried-fruits-3474/), [dried mango slices, by RoyBuri](https://pixabay.com/photos/mango-getroknet-fruit-yummy-3386353/), and [dried pineapple, by Antoni Shkraba](https://www.pexels.com/photo/dried-pineapple-slices-4499210/).

## Useful commands

- `npm.cmd run dev` — start local development.
- `npm.cmd run lint` — run ESLint.
- `npm.cmd run test:unit` — run focused order-search and cancellation-validation tests.
- `npm.cmd run build` — create a production build and type-check.
- `npm.cmd run db:generate` — generate Prisma Client.
- `npm.cmd run db:migrate -- --name <name>` — create/apply a local migration.
- `npm.cmd run db:migrate:deploy` — apply checked-in migrations in a deployment.
- `npm.cmd run db:seed` — add catalogue, roles, permissions, and the optional configured administrator.
- `npm.cmd run db:check` — verify the database connection.
- `npm.cmd run test:smoke` — test the running application and database (`APP_URL` can override `http://127.0.0.1:3000`).

Do not use real credentials in source control or expose PostgreSQL and administrator credentials to browser code.
