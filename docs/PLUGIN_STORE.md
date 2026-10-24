# Plugin Store

Status: **Stage 6 baseline implemented**.

## What works

- In-client **Plugin Store** tab under Settings → Nexora
- Official catalog from `registry/plugins.json` (mirrored in `src/nexoraPlugins/_registry/registryData.ts`)
- Search filter, metadata (license, category, source, permissions)
- Plugin Manager tab toggles Nexora plugins and recommended host (Vencord) plugins without double-patching

## Update / rollback (next iterations)

Planned hardening still includes: remote registry fetch, package hash/signature verification, permission-change prompts, recoverable previous versions, and update-all. Until then, update Nexora via git + `pnpm build` + `pnpm nexora:repair`.

## Offline

If a future remote registry is unreachable, installed plugin settings remain available in Plugin Manager; the store tab will report the error.
