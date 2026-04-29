# Deliveries

A small GitHub Pages app that shows pending deliveries found in email, plus separate tabs for digital licenses and subscriptions.

## How it works

- `data/deliveries.json` is the source of truth for the published site.
- `index.html`, `styles.css`, and `app.js` render the dashboard as a static site.
- GitHub Pages is deployed through `.github/workflows/deploy.yml`.
- A Codex automation can refresh `data/deliveries.json` from Gmail on a schedule and push the update.
- Visible app versioning follows [VERSIONING_SOP.md](./VERSIONING_SOP.md).

## Local preview

You can open `index.html` directly in a browser, or serve the folder with any static file server.

## Data format

Each entry in `data/deliveries.json` should include:

- `metadata.version`
- `supplier`
- `title`
- `status`
- `dueDate` in `YYYY-MM-DD` format, or `null`
- `timezone`
- `notes`
- `items`
- `links`
- `sourceEmail`, when the source Gmail message is known
- `deliveredDate`, when a delivered item is being retained for return-window tracking
- `returnByDate`, when an item is still eligible to return
- `returnAuthorizationGranted` or `returnStatus`, when a supplier has authorized a return

Return status colors are strict:

- Red means a return authorization has been granted and the item still needs to be brought or sent back for reimbursement.
- Orange means the item is still in hand, no return was requested, and it is still eligible near the end of the return window.
- A close return deadline alone should never make an item red.

The file also supports separate `licenses` and `subscriptions` arrays.
Subscription entries can include `renewalState` and `warningWindowDays` so the UI can flag renewals that are within a week.

## Automation goal

The scheduled refresh should:

1. Search Gmail for pending delivery updates from any convincing order, shipment, delivery, return, tracking, or marketplace email. Known suppliers such as Amazon, AliExpress, Temu, Bambu Lab, Kickstarter, Snapmaker, BIQU, and Tikamoon should still be searched explicitly, but the refresh should not reject real delivery signals just because the supplier is new.
2. Update `data/deliveries.json`.
3. Retain delivered Amazon items through their return window when `deliveredDate` is available; mark them orange once they are at least 21 days old and still returnable.
4. Treat red return status strictly as an accepted return authorization that still requires the item to be brought or sent back for reimbursement. Do not keep completed drop-off/refund returns red.
5. Refresh the `licenses` and `subscriptions` tabs from Gmail when there are relevant license, renewal, subscription, or digital-download emails.
6. Commit and push if anything changed.
7. For every dashboard data change, bump `metadata.version` according to `VERSIONING_SOP.md`.
8. Preserve license reminder fields like `renewalState`, `nextDate`, and `warningWindowDays` so near-renewal warnings stay accurate.
9. Verify that `origin/main` contains the new commit after pushing; if not, retry once and record the failure in automation memory.
