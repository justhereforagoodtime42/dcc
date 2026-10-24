/*
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Button, Forms, React, showToast } from "@webpack/common";

import { getTheme } from "../themeEditor";

function ImportExportTab() {
    return (
        <SettingsTab>
            <Forms.FormTitle tag="h2">Import / Export</Forms.FormTitle>
            <Flex flexDirection="column" gap="0.75em">
                <Paragraph>
                    Export themes from Theme Editor. Plugin settings use Backup &amp; Restore. Never execute arbitrary downloads on open.
                </Paragraph>
                <Button onClick={() => {
                    void navigator.clipboard.writeText(JSON.stringify(getTheme(), null, 2));
                    showToast({ text: "Theme JSON copied" });
                }}>
                    Copy current theme JSON
                </Button>
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(ImportExportTab, "Import / Export");
