/*
 * Permission Search — filter channel advanced permissions by name
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

import { AcidicReturns } from "../_shared/nexoraShared";

const settings = definePluginSettings({
    placeholder: {
        type: OptionType.STRING,
        description: "Placeholder text for the permission search box",
        default: "Search permissions…"
    }
});

const STYLE_ID = "nx-permission-search-style";
const BAR_ID = "nx-permission-search-bar";
const WRAP_ID = "nx-permission-search-wrap";

const GENERAL_TITLES = [
    "General Channel Permissions",
    "General Permissions",
];

/** Category / section headers in advanced permissions — never treated as permission names */
const SECTION_TITLES = new Set([
    "General Channel Permissions",
    "General Permissions",
    "Membership Permissions",
    "Text Channel Permissions",
    "Voice Channel Permissions",
    "Voice Permissions",
    "Stage Channel Permissions",
    "Events Permissions",
    "Advanced Permissions",
    "Advanced permissions",
    "Clipboard Permissions",
    "Apps Permissions",
]);

function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${WRAP_ID} {
  display: block !important;
  width: 100%;
  margin: 0 0 12px;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
}
#${BAR_ID} {
  display: block !important;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, var(--background-modifier-accent));
  background: var(--input-background, var(--background-secondary)) !important;
  color: var(--text-default) !important;
  font-size: 14px;
  outline: none;
  visibility: visible !important;
  opacity: 1 !important;
}
#${BAR_ID}:focus {
  border-color: var(--brand-500, #5865f2);
}
[data-nx-perm-hidden="1"] {
  display: none !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
  height: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
}
/* Survives Discord re-renders: while searching, kill every divider under the panel */
[data-nx-perm-filtering="1"] hr,
[data-nx-perm-filtering="1"] [role="separator"],
[data-nx-perm-filtering="1"] [class*="divider"],
[data-nx-perm-filtering="1"] [class*="separator"],
[data-nx-perm-filtering="1"] [class*="hairline"],
[data-nx-perm-filtering="1"] [class*="Divider"],
[data-nx-perm-filtering="1"] [class*="Separator"] {
  display: none !important;
  margin: 0 !important;
  padding: 0 !important;
  height: 0 !important;
  min-height: 0 !important;
  border: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
/* Discord often draws lines via border-bottom on row wrappers */
[data-nx-perm-filtering="1"] [class*="permission"],
[data-nx-perm-filtering="1"] [class*="Permission"] {
  border-top: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
}
`;
    document.head.appendChild(style);
}

function norm(s: string) {
    return s.replace(/\s+/g, " ").trim();
}

function findExactTextParent(exact: string | string[]): HTMLElement | null {
    const titles = Array.isArray(exact) ? exact : [exact];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        const t = norm(node.textContent || "");
        if (!titles.includes(t)) continue;
        const parent = node.parentElement;
        if (!parent || parent.tagName === "SCRIPT" || parent.tagName === "STYLE") continue;
        return parent;
    }
    return null;
}

function findGeneralHeading(): HTMLElement | null {
    return findExactTextParent(GENERAL_TITLES);
}

function findViewChannelAnchor(): HTMLElement | null {
    const label = findExactTextParent("View Channel");
    if (!label) return null;
    let row: HTMLElement | null = label;
    for (let i = 0; i < 8 && row; i++) {
        if (hasToggle(row)) return row;
        row = row.parentElement;
    }
    return label;
}

function isAdvancedPermissionsView(): boolean {
    const body = document.body.innerText || "";
    return (
        body.includes("General Channel Permissions") ||
        (body.includes("Advanced permissions") && body.includes("View Channel") && body.includes("Manage Channel"))
    );
}

function hasToggle(el: Element) {
    return !!el.querySelector(
        '[role="radio"], [role="checkbox"], [role="switch"], input[type="checkbox"], input[type="radio"], [class*="checkbox"], [class*="slider"]'
    );
}

/**
 * Permission display name only — first short label line, not the description.
 * Discord rows are typically: Title (short) + Description (long sentence) + toggles.
 */
function getPermissionName(row: HTMLElement): string {
    // Prefer an explicit title-ish child
    const titleCandidates = row.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, label, strong, [class*='title'], [class*='name'], [class*='label']");
    for (const el of titleCandidates) {
        const t = norm(el.textContent || "");
        if (!t || t.length > 60) continue;
        if (SECTION_TITLES.has(t)) continue;
        if (t.includes(".") && t.length > 40) continue; // description sentence
        // Must be a leaf-ish label, not the whole row
        if (el.querySelector('[role="radio"], [role="checkbox"], input')) continue;
        return t;
    }

    // Fallback: first text node / first short line in the row
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        const t = norm(node.textContent || "");
        if (!t || t.length > 60) continue;
        if (SECTION_TITLES.has(t)) continue;
        // Skip pure punctuation / symbols from toggles
        if (/^[✓✗×/\\|•\-–—]+$/.test(t)) continue;
        return t;
    }

    // Last resort: first line of textContent
    const firstLine = norm((row.textContent || "").split("\n")[0] || "");
    return firstLine.length <= 60 ? firstLine : "";
}

function collectPermissionRows(panelRoot: HTMLElement): HTMLElement[] {
    const byClass = [...panelRoot.querySelectorAll<HTMLElement>('[class*="permission"]')].filter(el => {
        if (el.id === WRAP_ID || el.querySelector(`#${BAR_ID}`)) return false;
        if (!hasToggle(el)) return false;
        const name = getPermissionName(el);
        return name.length >= 2 && !SECTION_TITLES.has(name);
    });

    let rows = byClass.filter(r => !byClass.some(o => o !== r && r.contains(o)));
    if (rows.length >= 4) return rows;

    const loose: HTMLElement[] = [];
    panelRoot.querySelectorAll<HTMLElement>("div").forEach(el => {
        if (el.id === WRAP_ID || el.querySelector(`#${BAR_ID}`)) return;
        if (!hasToggle(el)) return;
        const name = getPermissionName(el);
        if (name.length < 2 || name.length > 60) return;
        if (SECTION_TITLES.has(name)) return;
        if (el.children.length > 12) return;
        const toggleCount = el.querySelectorAll(
            '[role="radio"], [role="checkbox"], [role="switch"], input[type="checkbox"], input[type="radio"]'
        ).length;
        if (toggleCount < 1 || toggleCount > 6) return;
        loose.push(el);
    });

    return loose.filter(r => !loose.some(o => o !== r && r.contains(o)));
}

function collectSectionHeaders(panelRoot: HTMLElement): HTMLElement[] {
    const headers: HTMLElement[] = [];
    for (const title of SECTION_TITLES) {
        const walker = document.createTreeWalker(panelRoot, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
            if (norm(node.textContent || "") !== title) continue;
            const parent = node.parentElement;
            if (!parent) continue;
            if (parent.id === WRAP_ID || parent.closest(`#${WRAP_ID}`)) continue;
            headers.push(parent);
        }
    }
    return [...new Set(headers)];
}

function isSeparator(el: Element): boolean {
    if (el.tagName === "HR") return true;
    if (el.getAttribute("role") === "separator") return true;
    const cls = typeof (el as HTMLElement).className === "string"
        ? (el as HTMLElement).className
        : "";
    return /divider|separator|hairline|rule/i.test(cls);
}

function collectSeparators(panelRoot: HTMLElement): HTMLElement[] {
    const out: HTMLElement[] = [];
    panelRoot.querySelectorAll<HTMLElement>("hr, [role='separator'], [class*='divider'], [class*='separator'], [class*='hairline']").forEach(el => {
        if (el.id === WRAP_ID || el.closest(`#${WRAP_ID}`)) return;
        if (el.closest("[data-nx-perm-hidden='1']")) return;
        out.push(el);
    });
    // Also catch thin decorative lines Discord sometimes uses without those class names
    panelRoot.querySelectorAll<HTMLElement>("div").forEach(el => {
        if (out.includes(el)) return;
        if (el.id === WRAP_ID || el.closest(`#${WRAP_ID}`)) return;
        if (el.children.length > 0) return;
        if ((el.textContent || "").trim()) return;
        const rect = el.getBoundingClientRect();
        if (rect.height > 0 && rect.height <= 3 && rect.width > 40) out.push(el);
    });
    return out;
}

/** Hide wrappers that only contain hidden / separator / our search bar children */
function collapseEmptyContainers(root: HTMLElement, protectedEls: Set<HTMLElement>) {
    // Bottom-up: deepest first so parents see already-hidden children
    const candidates = [...root.querySelectorAll<HTMLElement>("div, section, li, ul, fieldset")]
        .filter(el => !protectedEls.has(el) && el.id !== WRAP_ID && !el.closest(`#${WRAP_ID}`))
        .sort((a, b) => (b.contains(a) ? 1 : a.contains(b) ? -1 : 0));

    for (const el of candidates) {
        if (protectedEls.has(el)) continue;
        if (el.dataset.nxPermHidden === "1") continue;
        // Never collapse the content scroller itself
        if (/contentColumn|contentRegion|scroller/i.test(el.className || "")) continue;

        const kids = [...el.children] as HTMLElement[];
        if (kids.length === 0) continue;

        const meaningful = kids.filter(k => {
            if (k.id === WRAP_ID || k.closest(`#${WRAP_ID}`)) return false;
            if (k.dataset.nxPermHidden === "1") return false;
            if (isSeparator(k)) return false;
            // ignore empty whitespace-only nodes
            if (!k.children.length && !(k.textContent || "").trim()) return false;
            return true;
        });

        if (meaningful.length === 0) {
            el.dataset.nxPermHidden = "1";
        }
    }
}

function panelRootNear(anchor: HTMLElement): HTMLElement {
    return (
        anchor.closest<HTMLElement>(
            '[class*="contentColumn"], [class*="contentRegion"], [class*="scrollerInner"], [class*="scroller"], form'
        ) || anchor.parentElement || document.body
    );
}

function applyFilter(anchor: HTMLElement, query: string) {
    const q = query.trim().toLowerCase();
    const root = panelRootNear(anchor);
    const rows = collectPermissionRows(root);
    const headers = collectSectionHeaders(root);

    // Reset previous filter marks in this panel
    root.querySelectorAll<HTMLElement>("[data-nx-perm-hidden]").forEach(el => {
        delete el.dataset.nxPermHidden;
    });

    if (!q) {
        delete root.dataset.nxPermFiltering;
        return;
    }

    // CSS flag: hides dividers even if Discord recreates them mid-search
    root.dataset.nxPermFiltering = "1";

    // Match permission NAME only (not description / category)
    for (const row of rows) {
        const name = getPermissionName(row).toLowerCase();
        if (name.includes(q)) delete row.dataset.nxPermHidden;
        else row.dataset.nxPermHidden = "1";
    }

    // Hide category headers when none of their permission rows match
    for (const header of headers) {
        const headerTitle = norm(header.textContent || "");
        // Keep General header so the search bar stays under a visible label
        if (GENERAL_TITLES.includes(headerTitle)) {
            delete header.dataset.nxPermHidden;
            continue;
        }

        const sectionRows = rows.filter(row => {
            if (!(header.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
            for (const other of headers) {
                if (other === header) continue;
                const afterHeader = !!(header.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING);
                const beforeRow = !!(other.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING);
                if (afterHeader && beforeRow) return false;
            }
            return true;
        });

        const anyVisible = sectionRows.some(r => r.dataset.nxPermHidden !== "1");
        if (anyVisible) delete header.dataset.nxPermHidden;
        else header.dataset.nxPermHidden = "1";
    }

    // Belt-and-suspenders for dividers without divider/separator in the class name
    for (const sep of collectSeparators(root)) {
        sep.dataset.nxPermHidden = "1";
    }

    const protectedEls = new Set<HTMLElement>([
        ...rows.filter(r => r.dataset.nxPermHidden !== "1"),
        ...headers.filter(h => h.dataset.nxPermHidden !== "1"),
        ...(document.getElementById(WRAP_ID) ? [document.getElementById(WRAP_ID)!] : []),
    ]);
    // Keep ancestors of visible rows / search bar from being collapsed
    for (const keep of [...protectedEls]) {
        let p = keep.parentElement;
        while (p && p !== root) {
            protectedEls.add(p);
            p = p.parentElement;
        }
    }

    collapseEmptyContainers(root, protectedEls);
}

function ensureSearchUi(): { wrap: HTMLDivElement; input: HTMLInputElement; } {
    ensureStyle();

    let wrap = document.getElementById(WRAP_ID) as HTMLDivElement | null;
    let input = document.getElementById(BAR_ID) as HTMLInputElement | null;

    if (!wrap || !input) {
        wrap?.remove();
        wrap = document.createElement("div");
        wrap.id = WRAP_ID;

        input = document.createElement("input");
        input.id = BAR_ID;
        input.type = "search";
        input.placeholder = settings.store.placeholder || "Search permissions…";
        input.autocomplete = "off";
        input.spellcheck = false;

        input.addEventListener("input", () => {
            const heading = findGeneralHeading() || findViewChannelAnchor();
            if (heading && input) applyFilter(heading, input.value);
        });

        wrap.appendChild(input);
    }

    return { wrap, input };
}

function placeSearchBar() {
    if (!isAdvancedPermissionsView()) {
        document.getElementById(WRAP_ID)?.remove();
        clearHidden();
        return;
    }

    const heading = findGeneralHeading();
    const viewChannel = findViewChannelAnchor();
    const { wrap, input } = ensureSearchUi();

    if (heading) {
        if (heading.nextElementSibling !== wrap) {
            heading.insertAdjacentElement("afterend", wrap);
        }
    } else if (viewChannel) {
        if (viewChannel.previousElementSibling !== wrap) {
            viewChannel.insertAdjacentElement("beforebegin", wrap);
        }
    } else {
        return;
    }

    applyFilter(heading || viewChannel!, input.value);
}

function clearHidden() {
    document.querySelectorAll<HTMLElement>("[data-nx-perm-hidden]").forEach(el => {
        delete el.dataset.nxPermHidden;
    });
    document.querySelectorAll<HTMLElement>("[data-nx-perm-filtering]").forEach(el => {
        delete el.dataset.nxPermFiltering;
    });
}

export default definePlugin({
    name: "PermissionSearch",
    description: "Adds a search box under General Channel Permissions so you can filter advanced permissions without scrolling",
    authors: [AcidicReturns],
    tags: ["Utility"],
    enabledByDefault: true,
    settings,

    start() {
        ensureStyle();
        placeSearchBar();
        this._obs = new MutationObserver(() => {
            if (this._timer) window.clearTimeout(this._timer);
            this._timer = window.setTimeout(() => placeSearchBar(), 50);
        });
        this._obs.observe(document.body, { childList: true, subtree: true });
    },

    stop() {
        this._obs?.disconnect();
        if (this._timer) window.clearTimeout(this._timer);
        document.getElementById(WRAP_ID)?.remove();
        document.getElementById(STYLE_ID)?.remove();
        clearHidden();
    },

    _obs: null as MutationObserver | null,
    _timer: 0 as number
});
