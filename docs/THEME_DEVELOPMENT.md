# Theme Development (Nexora)

Themes are **CSS only**. Themes must not execute JavaScript.

## Host mechanism

Nexora inherits Vencord’s theme system:

- QuickCSS (in-app editor)
- Local theme files under the data directory `themes/*.css`
- Optional online theme link imports

See Discord Settings → Themes after injecting Nexora.

## Planned `.theme.json` editor

A structured visual Theme Editor (backgrounds, accents, fonts, density, import/export) is planned for a later stage. It will compile to CSS compatible with this host mechanism and keep custom CSS **opt-in**.

## Sharing

Theme packages must stay separate from executable plugin packages. Validate schemas and assets; reject JS payloads.
