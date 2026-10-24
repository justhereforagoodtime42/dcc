/*
 * Declutter plugin
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSettings, SettingsStore } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

import { NexoraAuthors } from "../_shared/nexoraShared";
import managedStyle from "./style.css?managed";

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
    authors: [...NexoraAuthors],
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
