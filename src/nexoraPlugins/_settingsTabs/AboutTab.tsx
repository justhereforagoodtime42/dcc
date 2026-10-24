/*
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { plugins as Plugins } from "@api/PluginManager";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Forms, React } from "@webpack/common";

import gitHash from "~git-hash";

import { NEXORA_VERSION } from "../_shared/nexoraShared";

function AboutTab() {
    return (
        <SettingsTab>
            <Forms.FormTitle tag="h2">About &amp; Diagnostics</Forms.FormTitle>
            <Flex flexDirection="column" gap="0.75em">
                <Paragraph>Nexora {NEXORA_VERSION}</Paragraph>
                <Paragraph>Git: {gitHash || "unknown"}</Paragraph>
                <Paragraph>Based on Vencord (GPL-3.0-or-later). Not affiliated with Discord Inc.</Paragraph>
                <Paragraph>Repo: https://github.com/justhereforagoodtime42/dcc</Paragraph>
                <Paragraph>Loaded plugins: {Object.keys(Plugins).length}</Paragraph>
                <Paragraph>Enable or disable any plugin under the Plugins tab.</Paragraph>
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(AboutTab, "About");
