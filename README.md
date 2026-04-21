# Deliveries

A small GitHub Pages app that shows pending deliveries from Amazon, AliExpress, Temu, Bambu Lab, Kickstarter, Snapmaker, and BIQU, plus a second tab for digital licenses and subscriptions found in email.

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

The file also supports a `licenses` array for digital access and subscription records shown in the second tab.
License entries can include `renewalState` and `warningWindowDays` so the UI can flag renewals that are within a week.

## Automation goal

The scheduled refresh should:

1. Search Gmail for pending delivery updates across Amazon, AliExpress, Temu, Bambu Lab, Kickstarter, Snapmaker, and BIQU.
2. Update `data/deliveries.json`.
3. Refresh the `licenses` tab from Gmail when there are relevant license, renewal, subscription, or digital-download emails.
4. Commit and push if anything changed.
5. If the app changes, bump `metadata.version` according to `VERSIONING_SOP.md`.
6. Preserve license reminder fields like `renewalState`, `nextDate`, and `warningWindowDays` so near-renewal warnings stay accurate.
