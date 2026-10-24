/*
 * Permission Search — filter channel advanced permissions by name
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

import { NexoraAuthors } from "../_shared/nexoraShared";

const settings = definePluginSettings({
    placeholder: {
        type: OptionType.STRING,
        description: "Placeholder text for the permission search box",
        default: "Search permissions…"
    }
});

const STYLE_ID = "nx-permission-search-style";
const BAR_ID = "nx-permission-search-bar";

function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${BAR_ID} {
  position: sticky;
  top: 0;
  z-index: 5;
  margin: 0 0 12px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, var(--background-modifier-accent));
  background: var(--input-background, var(--background-secondary));
  color: var(--text-default);
  width: 100%;
  box-sizing: border-box;
  font-size: 14px;
}
[data-nx-perm-hidden="1"] {
  display: none !important;
}
`;
    document.head.appendChild(style);
}

function looksLikePermissionPanel(root: ParentNode): HTMLElement | null {
    // Channel settings → Permissions: long list of allow/deny toggles with permission labels
    const candidates = root.querySelectorAll<HTMLElement>(
        '[class*="contentColumn"] [class*="container"], [class*="contentRegion"] [class*="scroller"], [class*="content"]'
    );
    for (const el of candidates) {
        const text = el.textContent || "";
        if (
            text.includes("View Channel") &&
            (text.includes("Manage Channels") || text.includes("Send Messages") || text.includes("Connect"))
        ) {
            return el;
        }
    }
    return null;
}

function permissionRows(panel: HTMLElement): HTMLElement[] {
    const rows: HTMLElement[] = [];
    panel.querySelectorAll<HTMLElement>("div").forEach(div => {
        // Heuristic: a row that contains a checkbox/radio/switch and a short label
        const hasControl = !!div.querySelector('input[type="checkbox"], [role="checkbox"], [role="switch"], [class*="checkbox"]');
        if (!hasControl) return;
        if (div.children.length > 12) return;
        const label = (div.textContent || "").trim();
        if (label.length < 3 || label.length > 80) return;
        if (div.querySelector(`#${BAR_ID}`)) return;
        rows.push(div);
    });
    // Prefer deeper unique rows: keep leaves that aren't ancestors of other matches
    return rows.filter(r => !rows.some(o => o !== r && r.contains(o)));
}

function applyFilter(panel: HTMLElement, query: string) {
    const q = query.trim().toLowerCase();
    for (const row of permissionRows(panel)) {
        const match = !q || (row.textContent || "").toLowerCase().includes(q);
        row.dataset.nxPermHidden = match ? "0" : "1";
    }
}

function mountSearch(panel: HTMLElement) {
    if (panel.querySelector(`#${BAR_ID}`)) return;

    ensureStyle();
    const input = document.createElement("input");
    input.id = BAR_ID;
    input.type = "search";
    input.placeholder = settings.store.placeholder || "Search permissions…";
    input.autocomplete = "off";
    input.addEventListener("input", () => applyFilter(panel, input.value));

    const anchor =
        panel.querySelector<HTMLElement>('[class*="title"], h1, h2, h3') ||
        panel.firstElementChild;
    if (anchor?.parentElement) {
        anchor.parentElement.insertBefore(input, anchor.nextSibling);
    } else {
        panel.prepend(input);
    }
}

function scan() {
    const panel = looksLikePermissionPanel(document);
    if (!panel) return;
    mountSearch(panel);
}

export default definePlugin({
    name: "PermissionSearch",
    description: "Adds a search box on channel advanced permissions so you can jump to a permission without scrolling",
    authors: [...NexoraAuthors],
    tags: ["Utility"],
    enabledByDefault: true,
    settings,

    start() {
        ensureStyle();
        scan();
        this._obs = new MutationObserver(() => scan());
        this._obs.observe(document.body, { childList: true, subtree: true });
    },

    stop() {
        this._obs?.disconnect();
        document.getElementById(BAR_ID)?.remove();
        document.getElementById(STYLE_ID)?.remove();
        document.querySelectorAll("[data-nx-perm-hidden]").forEach(el => {
            delete (el as HTMLElement).dataset.nxPermHidden;
        });
    },

    _obs: null as MutationObserver | null
});
