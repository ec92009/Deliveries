# Versioning SOP

- Use visible app versions in the form `vX.Y`.
- `X` is the number of days since `2026-02-28`.
- `Y` increments with each build/change on that same day.
- Example: on `2026-03-31`, start at `v31.0`, then `v31.1`, `v31.2`, and so on.
- Store the current version in `data/deliveries.json` as `metadata.version`.
- Show the current version in the published UI.
- When making a new build on the same day, always bump the minor version.
