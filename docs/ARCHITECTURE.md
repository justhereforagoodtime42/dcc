# Nexora Architecture

## Product decision

**Nexora is an open-source customization layer for the existing Discord desktop client.**

It is **not**:

- A standalone Discord-like messaging app
- A new Electron chat shell or login screen
- A replacement chat protocol or self-hosted Discord backend
- An official Discord product

Nexora integrates with a Discord installation the user already has, using the same general approach as established client mods: patch the desktop client’s loader, then run plugins and themes inside that process.

## Approach chosen: fork Vencord (Approach A)

| Approach | Verdict |
| --- | --- |
| **A — Fork Vencord** | **Selected.** Reuses a maintained injector, webpack patcher, plugin API, themes, and installer wiring. |
| B — Independent framework | Rejected for Stage 1+. Would reimplement asar injection, patching, and Discord update churn with little benefit. |
| Continue Electron chat client | Rejected. An earlier sibling project under `My Projects/Nexora` built a standalone MIT Electron chat app. That architecture does **not** match Nexora’s vision and is **out of scope** for this repository. |

**Upstream base:** [Vendicated/Vencord](https://github.com/Vendicated/Vencord) (GPL-3.0-or-later).

**Reference only:** [Equicord/Equicord](https://github.com/Equicord/Equicord) — same architecture with extra plugin trees; useful for fork layout patterns, not used as the git upstream.

**Primary git remotes for this repo:**

- `origin` → [justhereforagoodtime42/dcc](https://github.com/justhereforagoodtime42/dcc) (Nexora)
- `upstream` → [Vendicated/Vencord](https://github.com/Vendicated/Vencord)

## Runtime model

```
Discord Desktop (resources/app.asar)
        │
        │  installer renames → _app.asar (backup of original)
        │  writes tiny app.asar that require()s dist/patcher.js
        ▼
Nexora / Vencord patcher (Electron main)
        │
        ▼
Preload + renderer patches
        │
        ├── Plugins (src/plugins, src/nexoraPlugins, src/userplugins)
        └── Themes / QuickCSS (data dir, CSS only)
```

### Locating Discord

The upstream installer ([Vencord/Installer](https://github.com/Vencord/Installer)) discovers installs by channel:

- Windows: `%LOCALAPPDATA%\Discord`, `DiscordPTB`, `DiscordCanary`, …
- macOS / Linux: equivalent Application / share paths

Stage 1 reuses `pnpm inject` / `pnpm uninject` (downloads and runs that installer against this tree’s `dist/`). A Nexora-branded installer with conflict UX is planned for a later stage.

### Install / update / remove

1. **Install:** backup `app.asar` → `_app.asar`; inject loader pointing at built `dist/patcher.js`.
2. **Update Nexora:** rebuild (`pnpm build`), re-inject if needed.
3. **Discord updates:** Discord often replaces `app.asar`, wiping the patch — re-run inject. Webpack string changes can break individual plugin patches until fixed.
4. **Uninstall:** restore `_app.asar` → `app.asar`. Does not delete unrelated user files.

Never request Discord passwords or user tokens.

### Plugins

- API: `definePlugin` / `PluginDef` (`src/utils/types.ts`)
- Built-in upstream: `src/plugins/`
- **Nexora-specific:** `src/nexoraPlugins/` (scanned by the build like other plugin roots)
- Local custom / WIP: `src/userplugins/` (gitignored)
- Lifecycle: enable/disable, settings store, patches, start/stop via `PluginManager`

### Themes

- QuickCSS and `themes/*.css` under the Vencord/Nexora data directory
- Themes must not execute JavaScript
- Visual Theme Editor (structured `.theme.json`) is a later stage on top of this CSS mechanism

### Plugin store and community

Not part of upstream Vencord as a first-class marketplace. Nexora will add registry/store/creator tooling in later stages, kept separate from upstream merge paths.

## Compatibility and maintenance

- Declare supported Discord channels after testing; do not claim untested support.
- Failed patches should fail per plugin where possible.
- Merge strategy: `git fetch upstream` then merge/rebase; keep Nexora changes in `src/nexoraPlugins/`, `docs/`, branding, and minimal glue (build pluginDirs, settings entries).

## Licensing

- Project license: **GPL-3.0-or-later** (inherited from Vencord). See `LICENSE` and `NOTICE`.
- Distributing binaries or modified works requires corresponding source and preserved copyright notices.
- Do not relicense the fork under MIT or another incompatible license.

## Policy and distribution risks

Discord’s Terms of Service (effective September 29, 2025) grant a limited license to run Discord’s software and prohibit copying, modifying, creating derivative works of, or reverse-engineering that software without permission. Restrictions also cover unauthorized software designed to modify Discord’s services.

**Using Nexora (or any client mod) may violate Discord’s Terms of Service.** Account enforcement risk exists even if community reports of bans solely for client mods are uncommon. If losing an account would be catastrophic, do not use client modifications.

Nexora must not:

- Bypass authentication, access controls, or account restrictions
- Collect or request Discord passwords / user tokens
- Silently upload messages, settings, or logs
- Imply official Discord or Vencord endorsement
- Reuse Discord or Vencord trademarks/logos as Nexora branding

## Feasibility notes (plugins roadmap)

Many requested features (message logger, silent typing, volume booster, etc.) already exist as patterns in Vencord/Equicord plugins and are **feasible only where Discord’s client still exposes the needed modules**. Features that require bypassing server-side access controls are **unsupported**. Stage 1 does not ship the full plugin set; later stages must verify each plugin against the live host API.

## Stage status

| Stage | Focus | Status |
| --- | --- | --- |
| 1 | Fork bootstrap, docs, Nexora identity, build | In progress |
| 2 | Installer UX / conflicts | Planned |
| 3 | Built-in Nexora plugins | Planned |
| 4 | Theme editor | Planned |
| 5 | Plugin Creator | Planned |
| 6 | Plugin store / updates | Planned |
| 7 | Community submissions | Planned |
| 8 | Hardening / releases | Planned |
