/*
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Button, Forms, React, showToast } from "@webpack/common";

function UpdatesTab() {
    return (
        <SettingsTab>
            <Forms.FormTitle tag="h2">Updates</Forms.FormTitle>
            <Flex flexDirection="column" gap="0.75em">
                <Paragraph>
                    Update with <code>git pull</code>, <code>pnpm install --frozen-lockfile</code>, <code>pnpm build</code>, then <code>pnpm nexora:install:force</code> if Discord replaced app.asar.
                </Paragraph>
                <Button onClick={() => showToast({ text: "git pull && pnpm build && pnpm nexora:status" })}>
                    Show update commands
                </Button>
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(UpdatesTab, "Updates");
