/*
 * Nexora Plugin Creator (logic lives in hub UI + templates.ts)
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";

import { NexoraAuthors } from "../_shared/nexoraShared";

/** Marker plugin so Plugin Manager lists Creator support; UI is in Nexora hub. */
export default definePlugin({
    name: "NexoraPluginCreator",
    description: "Enables the Plugin Creator tab in Nexora settings (template generator)",
    authors: [...NexoraAuthors],
    tags: ["Developers"],
});
