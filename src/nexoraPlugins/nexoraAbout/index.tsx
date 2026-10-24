/*
 * Nexora, a Discord client customization project (fork of Vencord)
 * Copyright (c) 2026 Nexora contributors
 * Copyright (c) Vendicated and contributors (Vencord)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { InfoIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { removeFromArray } from "@utils/misc";
import definePlugin from "@utils/types";

import AboutPage from "./AboutPage";

export default definePlugin({
    name: "NexoraAbout",
    description: "Adds the Nexora About & Diagnostics entry to Discord settings",
    authors: [{ name: "Nexora", id: 0n }],
    required: true,

    start() {
        SettingsPlugin.customEntries.push({
            key: "nexora_about",
            title: "Nexora",
            panelTitle: "Nexora — About & Diagnostics",
            Component: AboutPage,
            Icon: InfoIcon
        });
    },

    stop() {
        removeFromArray(SettingsPlugin.customEntries, e => e.key === "nexora_about");
    },
});
