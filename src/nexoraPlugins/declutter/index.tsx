/*
 * Declutter plugin (ported — original authors below)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSettings, SettingsStore } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

import managedStyle from "./style.css?managed";

/** Do not credit Nexora / acidicreturns — Equicord Declutter authors */
const Authors = [
    { name: "Leon135", id: 309275452231385088n },
    { name: "prism", id: 390884143749136386n },
    { name: "Kyuuhachi", id: 236588665420251137n },
    { name: "SomeAspy", id: 516750892372852754n },
] as const;

migratePluginSettings("Declutter", "NexoraDeclutter");

const settings = definePluginSettings({
    hideGiftButton: {
        type: OptionType.BOOLEAN,
        description: "Hide the Nitro gift button in the chat bar when present",
        default: false
    },
    hideHelpButton: {
        type: OptionType.BOOLEAN,
        description: "Hide the help / support toolbar control when present",
        default: false
    },
    hideDownloadApps: {
        type: OptionType.BOOLEAN,
        description: "Hide Download Apps promo entry points when present",
        default: true
    },
    compactMemberList: {
        type: OptionType.BOOLEAN,
        description: "Reduce member list padding / density (CSS only)",
        default: false
    }
});

function applyClasses() {
    const root = document.documentElement;
    root.classList.toggle("nx-hide-gift", !!settings.store.hideGiftButton);
    root.classList.toggle("nx-hide-help", !!settings.store.hideHelpButton);
    root.classList.toggle("nx-hide-download-apps", !!settings.store.hideDownloadApps);
    root.classList.toggle("nx-compact-members", !!settings.store.compactMemberList);
}

export default definePlugin({
    name: "Declutter",
    description: "Hide or densify supported Discord UI chrome via CSS (restorable)",
    authors: [...Authors],
    tags: ["Appearance"],
    enabledByDefault: true,
    settings,
    managedStyle,

    start() {
        applyClasses();
        SettingsStore.addChangeListener("plugins.Declutter", applyClasses);
    },

    stop() {
        SettingsStore.removeChangeListener("plugins.Declutter", applyClasses);
        document.documentElement.classList.remove(
            "nx-hide-gift", "nx-hide-help", "nx-hide-download-apps", "nx-compact-members"
        );
    }
});
