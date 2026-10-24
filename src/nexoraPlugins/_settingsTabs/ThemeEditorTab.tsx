/*
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Button, Forms, React, showToast, TextInput, useState } from "@webpack/common";

import { applyThemeCss, getTheme, setTheme, themeEditorSettings } from "../themeEditor";
import { DEFAULT_THEME, NexoraThemeJson, themeToCss, validateTheme } from "../themeEditor/themeJson";

function ThemeEditorTab() {
    const [theme, setLocal] = useState<NexoraThemeJson>(() => getTheme());
    const [customCssOptIn, setOptIn] = useState(() => !!themeEditorSettings.store.allowCustomCss);

    const update = (patch: Partial<NexoraThemeJson>) => {
        const next = {
            ...theme,
            ...patch,
            colors: { ...theme.colors, ...patch.colors },
            typography: { ...theme.typography, ...patch.typography },
            layout: { ...theme.layout, ...patch.layout },
            effects: { ...theme.effects, ...patch.effects }
        };
        setLocal(next);
        try {
            setTheme(next);
        } catch (e: any) {
            showToast({ text: e?.message || "Invalid theme", variant: "critical" });
        }
    };

    return (
        <SettingsTab>
            <Forms.FormTitle tag="h2">Theme Editor</Forms.FormTitle>
            <Paragraph>Structured <code>.theme.json</code> → CSS. Themes never execute JavaScript. Enable the ThemeEditor plugin under Plugins if live preview is off.</Paragraph>

            <Flex flexDirection="column" gap="0.75em">
                <Forms.FormTitle tag="h4">Name</Forms.FormTitle>
                <TextInput value={theme.name} onChange={v => update({ name: v })} />
                <Forms.FormTitle tag="h4">Accent</Forms.FormTitle>
                <TextInput value={theme.colors?.accent || ""} onChange={v => update({ colors: { accent: v } })} />
                <Forms.FormTitle tag="h4">Background</Forms.FormTitle>
                <TextInput value={theme.colors?.background || ""} onChange={v => update({ colors: { background: v } })} />
                <Forms.FormTitle tag="h4">Chat background</Forms.FormTitle>
                <TextInput value={theme.colors?.chatBackground || ""} onChange={v => update({ colors: { chatBackground: v } })} />
                <Forms.FormTitle tag="h4">Sidebar</Forms.FormTitle>
                <TextInput value={theme.colors?.sidebar || ""} onChange={v => update({ colors: { sidebar: v } })} />
                <Forms.FormTitle tag="h4">Text</Forms.FormTitle>
                <TextInput value={theme.colors?.text || ""} onChange={v => update({ colors: { text: v } })} />
                <Forms.FormTitle tag="h4">Font family</Forms.FormTitle>
                <TextInput value={theme.typography?.fontFamily || ""} onChange={v => update({ typography: { fontFamily: v } })} />

                <FormSwitch
                    title="Allow custom CSS (opt-in)"
                    description="Arbitrary CSS can break layout and accessibility."
                    value={customCssOptIn}
                    onChange={v => {
                        setOptIn(v);
                        themeEditorSettings.store.allowCustomCss = v;
                        applyThemeCss();
                    }}
                    hideBorder
                />
                {customCssOptIn && (
                    <textarea
                        style={{ width: "100%", minHeight: 120, fontFamily: "monospace" }}
                        value={theme.customCss || ""}
                        onChange={e => update({ customCss: (e.target as HTMLTextAreaElement).value })}
                    />
                )}

                <Flex gap="0.5em">
                    <Button onClick={() => { update(DEFAULT_THEME); showToast({ text: "Reset to default" }); }}>Reset</Button>
                    <Button onClick={() => {
                        void navigator.clipboard.writeText(JSON.stringify(theme, null, 2));
                        showToast({ text: "Copied .theme.json" });
                        void themeToCss(theme);
                    }}>Export JSON</Button>
                    <Button onClick={() => {
                        const text = prompt("Paste .theme.json");
                        if (!text) return;
                        try {
                            const v = validateTheme(JSON.parse(text));
                            if (!v.ok) return showToast({ text: v.error, variant: "critical" });
                            setLocal(v.theme);
                            setTheme(v.theme);
                            showToast({ text: "Imported theme", variant: "success" });
                        } catch {
                            showToast({ text: "Invalid JSON", variant: "critical" });
                        }
                    }}>Import JSON</Button>
                </Flex>
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(ThemeEditorTab, "Theme Editor");
