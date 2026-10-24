/*
 * Nexora, a Discord client customization project (fork of Vencord)
 * Copyright (c) 2026 Nexora contributors
 * Copyright (c) Vendicated and contributors (Vencord)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Divider } from "@components/Divider";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { Forms } from "@webpack/common";

import gitHash from "~git-hash";

function NexoraAboutTab() {
    return (
        <SettingsTab>
            <Forms.FormTitle tag="h2">Nexora</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>
                Open-source customization layer for the Discord desktop client you already have.
                Nexora is not a standalone chat app and is not affiliated with Discord Inc.
            </Forms.FormText>

            <Divider />

            <Forms.FormTitle tag="h3" className={Margins.top16}>About</Forms.FormTitle>
            <Forms.FormText>
                Build: {gitHash || "unknown"}
            </Forms.FormText>
            <Forms.FormText className={Margins.top8}>
                Based on Vencord (GPL-3.0-or-later). See NOTICE and docs/ARCHITECTURE.md in the repository.
            </Forms.FormText>

            <Forms.FormTitle tag="h3" className={Margins.top16}>Coming later</Forms.FormTitle>
            <Forms.FormText>
                Plugin Manager extras, Plugin Store, Theme Editor, Plugin Creator, Developer Tools,
                Updates, Import/Export, and expanded Diagnostics will appear here as stages land.
                Upstream Vencord Plugins, Themes, Cloud, and Backup panels remain available in Settings.
            </Forms.FormText>

            <Forms.FormTitle tag="h3" className={Margins.top16}>Policy</Forms.FormTitle>
            <Forms.FormText>
                Client modifications may violate Discord’s Terms of Service. Nexora never asks for your
                Discord password or user token. Do not install untrusted plugins.
            </Forms.FormText>
        </SettingsTab>
    );
}

export default wrapTab(NexoraAboutTab, "Nexora");
