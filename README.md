# Deliveries

A small GitHub Pages app that shows pending deliveries from Amazon, AliExpress, and Temu.

## How it works

- `data/deliveries.json` is the source of truth for the published site.
- `index.html`, `styles.css`, and `app.js` render the dashboard as a static site.
- GitHub Pages is deployed through `.github/workflows/deploy.yml`.
- A Codex automation can refresh `data/deliveries.json` from Gmail on a schedule and push the update.

## Local preview

You can open `index.html` directly in a browser, or serve the folder with any static file server.

## Data format

Each entry in `data/deliveries.json` should include:

- `supplier`
- `title`
- `status`
- `dueDate` in `YYYY-MM-DD` format, or `null`
- `timezone`
- `notes`
- `items`
- `links`

## Automation goal

The scheduled refresh should:

1. Search Gmail for pending delivery updates across Amazon, AliExpress, and Temu.
2. Update `data/deliveries.json`.
3. Commit and push if anything changed.

