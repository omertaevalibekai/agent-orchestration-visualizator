# Changelog

## 1.0.1 — 2026-10-28

- Preserve an intentionally empty saved agent map instead of restoring defaults on reload.
- Update Vite to 6.4.5 and refresh dependencies to resolve reported npm audit advisories.
- Check types, persistence regression tests, and production builds on pushes and pull requests.
- Document reproducible setup and enable dependency update proposals.

Limitations: data remains in browser localStorage. Changing the seed version or explicitly
resetting the map replaces saved data. There is no server synchronization or export backup.
This repository currently has no license file; this release does not grant a new license.
