# Project Site Inventory

Track every tool, piece of equipment and material by name and serial number, per project site plus a central warehouse. Updates are entered by hand, not tracked automatically.

## What users will see

1. **Starting stock when creating a project**: the New project panel gets an "Starting resources" list (item name, serial number optional, category, quantity, unit). Saving creates the project with that stock.
2. **Project details page**: clicking a project on Projects opens its own page showing:
   - Project info (name, number, client, location) and team
   - Inventory table: Item, Serial #, Category, Started with, Used/taken, Remaining (e.g. 20 / 1 / 19)
   - "Record usage" button per item (quantity + note), "Add stock", and a history list of every change with who and when
   - Links to that project's requests, substitutions and transfers
3. **Warehouse page** (new "Inventory" link in the nav):
   - A central Warehouse stock list you can add to and adjust
   - Totals for every item across all sites and the warehouse, with a per-site breakdown
   - Search, category filter, CSV export
4. **Serial-numbered items**: an item with a serial number is a single unit (quantity 1) so each can be followed individually; bulk materials use quantities without serials.

## Who can change it
- Everyone signed in can view.
- Admins and project managers can add items and set starting stock.
- Admins, project managers, superintendents and installation team can record usage.
- Every change is kept in the history and in the Activity log; nothing is silently edited.

## Out of scope for now
- Automatic moves from Material Transfer forms (can link later)
- Barcode/QR scanning, low-stock alerts

## Technical details
- New tables: `inventory_items` (location: project_id or null = warehouse, name, serial_number unique when set, category, unit, starting_qty) and `inventory_movements` (item_id, type: initial/added/used/adjusted, quantity, note, created_by). Remaining = starting + added - used ± adjusted, computed in a view.
- GRANTs + RLS using `has_role`; activity_log trigger on both tables.
- Routes: `/_authenticated/projects/$id` (details) with Projects rows linking to it; `/_authenticated/inventory` (warehouse + totals). Projects route becomes a layout with index.
- Hooks in `useIntegra.ts`: `useInventory(projectId?)`, `useInventoryMovements(itemId)`.
