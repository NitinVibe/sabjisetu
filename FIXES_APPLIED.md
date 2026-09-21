# SabziSetu Final Fixes

- Fixed modal scrolling so long forms (sales, payments, purchase edit, camera/proof) can always reach Save.
- Added full Mandi Purchase and Local Purchase edit flow with inventory-ledger-safe updates.
- Purchase edit supports date, vendor, item, specification, quantity, unit, and rate.
- Added purchase search by specification and specification filter.
- Made dashboard top-selling and stock snapshot specification-aware.
- Made Reports analytics group sales, purchases, and stock by item + specification.
- Reports now joins purchase/stock data by item + specification so variants do not merge.
- Preserved sale-level payment flow: Cash, UPI (camera/upload), Bank (transaction ID).
- Preserved sale-level Payments & Due and partial payments.
- Preserved ON CONFLICT payment fix.
