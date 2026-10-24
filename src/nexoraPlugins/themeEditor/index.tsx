/*
 * Nexora Theme Editor plugin
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { userStyleRootNode } from "@api/Styles";
import { createAndAppendStyle } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";

import { NexoraAuthors } from "../_shared/nexoraShared";
import { DEFAULT_THEME, NexoraThemeJson, themeToCss, validateTheme } from "./themeJson";

const settings = definePluginSettings({
    themeJson: {
        type: OptionType.STRING,
        description: "Serialized .theme.json (managed by Theme Editor UI)",
        default: JSON.stringify(DEFAULT_THEME)
    },
    allowCustomCss: {
        type: OptionType.BOOLEAN,
        description: "Opt-in: apply customCss from theme (can affect layout/a11y)",
        default: false
    },
    livePreview: {
        type: OptionType.BOOLEAN,
        description: "Apply theme CSS live while editing",
        default: true
    }
});

let styleEl: HTMLStyleElement | null = null;

export function getTheme(): NexoraThemeJson {
    try {
        const parsed = JSON.parse(settings.store.themeJson || "{}");
        const v = validateTheme(parsed);
        return v.ok ? v.theme : DEFAULT_THEME;
    } catch {
        return DEFAULT_THEME;
    }
}

export function setTheme(theme: NexoraThemeJson) {
    const v = validateTheme(theme);
    if (!v.ok) throw new Error(v.error);
    settings.store.themeJson = JSON.stringify(v.theme, null, 2);
    applyThemeCss();
}

export function applyThemeCss() {
    if (!settings.store.livePreview && styleEl) {
        styleEl.disabled = true;
        return;
    }
    const theme = getTheme();
    if (!settings.store.allowCustomCss) {
        theme.customCss = "";
    }
    const css = themeToCss(theme);
    if (!styleEl) {
        styleEl = createAndAppendStyle("nexora-theme-editor", userStyleRootNode);
    }
    styleEl.disabled = false;
    styleEl.textContent = css;
}

export function clearThemeCss() {
    if (styleEl) {
        styleEl.remove();
        styleEl = null;
    }
}

export { settings as themeEditorSettings };

export default definePlugin({
    name: "NexoraThemeEditor",
    description: "Visual .theme.json theme engine (CSS only; optional custom CSS is opt-in)",
    authors: [...NexoraAuthors],
    tags: ["Appearance"],
    settings,

    start() {
        applyThemeCss();
    },

    stop() {
        clearThemeCss();
    }
});
