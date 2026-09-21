# SabziSetu - Business Logic & Data Rules

## Inventory
- Purchases increase stock and recalculate average cost.
- Sales require sufficient stock and reduce stock atomically.
- Sale COGS is recorded from the stock average cost at sale time.
- Deleting a sale restores its quantity to stock.

## Customer / Due
- Every sale creates or updates a customer record.
- Customer mobile number is stored in `customers.phone`.
- A sale can save/update the customer's mobile number.
- Payments reduce outstanding due; payment cannot exceed current due.
- Changing a sale between Due/Paid recalculates the customer's due.
- Customer contact editing is available from Customers and Payments & Due.

## Reports
- Date-wise and monthly views use real database dates.
- Demand = quantity sold.
- Gross profit by sabji = sales revenue - recorded COGS.
- Purchase recommendations use demand velocity + current stock coverage + margin.
- Recommendations target approximately 7 days of demand.

## WhatsApp
- Payment/Due page has a WhatsApp reminder button.
- Customer mobile is normalized to an Indian WhatsApp number when a 10-digit number is entered.
- Reminder text includes customer name, business name and current due.
- A WhatsApp bill record is saved when a reminder is sent.

## Important
Use the same PostgreSQL database configured in `server/.env` (normally `sabzisetu_new`). Run `server/schema.sql` only for a new database or as a safe upgrade; it does not delete existing data.


## Latest dashboard and stock status
- Dashboard distinguishes today from recent history; zero today is shown as zero when there were no transactions today.
- Dashboard also shows last 7 days, recent sales, stock alerts, current due, and operating costs.
- Stock status is user-entered and stored in PostgreSQL; it is no longer derived from a hardcoded quantity threshold.
- Stock status can be edited after creation.

- Existing databases are automatically upgraded at server startup with stock.status and customers.phone if those columns are missing.

## Inventory ledger and deletion rules
- Stock is a cached balance backed by `stock_movements`.
- Every purchase creates a positive inventory movement at its purchase rate.
- Every sale creates a negative inventory movement and records its historical COGS.
- Manual opening/adjustment stock creates a positive manual movement at the entered cost.
- Deleting a purchase removes its exact inventory movement and rebuilds the item's stock/average cost. If the reversal would make stock negative, the purchase deletion is rejected.
- Deleting a sale removes its exact inventory movement, rebuilds stock, and recalculates the customer's due. A sale with recorded customer payments is blocked from deletion until the payment ledger is reconciled.
- Zero-quantity stock rows are removed during reconciliation instead of remaining as stale inventory records.
- Direct stock deletion is blocked when the item has purchase, sale, or opening history; users should reverse the source transaction instead.

## Item Master integrity
- Item Master is the canonical source for new transaction suggestions.
- A transaction can automatically create a missing item/specification in Item Master.
- Existing transaction data is synchronized into Item Master during server migration without reactivating an item that an admin deliberately deactivated.
- Deactivated items are hidden from new purchase/sales/stock autocomplete but remain in historical records.
- Permanent Item Master deletion is allowed only when the item has no stock or transaction history. Otherwise the item can be deactivated.
- Renaming an item with transaction history is blocked so historical stock, sales and reports cannot become disconnected from the master record.

## Customer ledger integrity
- Customers with sales or recorded payments cannot be permanently deleted.
- Customer due is derived from Due sales minus recorded customer payments.
- Sale/payment deletion or payment-status changes recalculate the customer summary fields.

## Payment & UPI proof
- Sales marked Paid store payment method (Cash/UPI/Bank) and optional UPI payment screenshot.
- Paid sales create a linked payment-ledger row so Sales, Payments & Due, Dashboard and payment history stay consistent.
- Customer due collections store payment method and optional UPI screenshot.
- UPI screenshots are compressed in the browser and stored with the transaction; no external file server is required.
- Sale-linked payments are excluded from outstanding-due calculations because the sale is already Paid.
- A sale-linked payment cannot be deleted independently; change the sale status back to Due instead.
- WhatsApp reminders are logged as `Reminder` records in WhatsApp Bills, while actual bill records remain `Bill` records.
- Calendar dates use Asia/Kolkata (India/Delhi) consistently.
