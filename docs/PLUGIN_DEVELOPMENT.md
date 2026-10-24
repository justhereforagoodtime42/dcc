# Plugin Development (Nexora)

Nexora uses the **Vencord plugin API**. Do not invent incompatible manifests for built-in or custom plugins.

## Locations

| Path | Purpose |
| --- | --- |
| `src/plugins/` | Upstream Vencord plugins (prefer not to fork lightly) |
| `src/nexoraPlugins/` | Official Nexora plugins (this project’s additions) |
| `src/userplugins/` | Local development plugins (gitignored) |

## Minimal custom plugin

1. Create `src/userplugins/myPlugin/index.ts`
2. Use `definePlugin({ name, description, authors, ... })`
3. Rebuild: `pnpm build` (or `pnpm build --watch`)
4. Restart Discord (or rely on hot reload where available)

Official docs for the host API: [docs.vencord.dev](https://docs.vencord.dev/) (custom plugins / plugin authoring).

## Expected metadata (Nexora conventions)

For plugins destined for the future Nexora store, plan for:

- Unique ID / name
- Description, author, SemVer
- License (GPL-compatible for in-tree plugins)
- Supported Discord / Nexora ranges (when declared)
- Settings schema via `definePluginSettings`
- Dependencies when required
- Source repository and changelog for releases

Stage 1 ships only the Nexora About identity plugin as a nexoraPlugins example.

## Testing

- Typecheck: `pnpm testTsc`
- Enable/disable the plugin in Discord Settings → Plugins
- Confirm a broken plugin does not take down unrelated plugins

A successful build does **not** prove a plugin is secure.
