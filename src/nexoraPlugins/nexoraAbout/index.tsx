/*
 * Required stub kept for settings migrations; sidebar tabs are registered in Settings core.
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { migratePluginSettings } from "@api/Settings";
import definePlugin from "@utils/types";

import { NexoraAuthors } from "../_shared/nexoraShared";

migratePluginSettings("NexoraSettings", "NexoraAbout");

/** Hidden required plugin so older installs migrate cleanly. UI is in Nexora Settings section. */
export default definePlugin({
    name: "NexoraSettings",
    description: "Nexora settings section (required)",
    authors: [...NexoraAuthors],
    tags: ["Customisation"],
    required: true,
});
