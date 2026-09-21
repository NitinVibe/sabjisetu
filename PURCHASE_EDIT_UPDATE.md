# Purchase Edit Update

Added full Edit support to both Mandi Purchase and Local Purchase.

## UI
- Pencil/Edit action is now shown for every purchase row.
- Edit modal allows changing date, vendor/farmer, item, specification, quantity, unit and rate.
- Amount is recalculated by the backend from quantity × unit conversion × rate.

## Backend
- Added PATCH `/:id` to the shared purchase router used by both:
  - `/api/mandi-purchases/:id`
  - `/api/local-purchases/:id`
- The edit updates the purchase and its inventory-ledger movement atomically.
- Stock is rebuilt after edits, including edits that change item/specification.
- Inventory timeline/non-negative checks are preserved.

## Database
No new database column/query is required. Existing purchase tables already contain all fields used by the edit form.
