# Payments & Due — sale-level payment tracking

This version makes outstanding dues item/specification aware.

- `sales` remains the source of each customer due item.
- `customer_payments.sale_id` links a collection to the exact sale.
- `source_sale_id` remains reserved for the automatic payment ledger entry created when a sale is created as Paid.
- Partial collections are supported. A sale becomes Paid only when its collected amount reaches the sale amount.
- UPI supports both camera capture and screenshot upload.
- Bank requires a transaction ID.
- Deleting a sale-linked collection recalculates the sale status.
- Legacy customer-level payments without `sale_id` are allocated oldest-due-first in the Payments & Due UI so existing data remains visible by item.

The server startup migration adds `sale_id` automatically for existing databases.
