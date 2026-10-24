# Supported versions

| Component | Version / note |
| --- | --- |
| Nexora | 0.1.0 |
| Upstream Vencord base | 1.15.13 (see git history / NOTICE) |
| Node | ≥ 22 (CI uses 24) |
| pnpm | 11.9.0 |
| Discord Stable | Tested inject on Windows `%LOCALAPPDATA%\Discord` app-1.0.9262 — **re-verify after Discord updates** |
| Discord PTB / Canary | Detectable by installer; not claimed supported until tested |

Never assume every Discord build works. After Discord updates, run `pnpm build` and `pnpm nexora:status` / reinstall.
