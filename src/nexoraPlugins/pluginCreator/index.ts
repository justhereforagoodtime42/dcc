/*
 * Plugin Creator marker (UI lives in Settings → Plugin Creator)
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { migratePluginSettings } from "@api/Settings";
import definePlugin from "@utils/types";

import { NexoraAuthors } from "../_shared/nexoraShared";

migratePluginSettings("PluginCreator", "NexoraPluginCreator");

export default definePlugin({
    name: "PluginCreator",
    description: "Enables the Plugin Creator settings tab templates",
    authors: [...NexoraAuthors],
    tags: ["Developers"],
    enabledByDefault: true,
});
