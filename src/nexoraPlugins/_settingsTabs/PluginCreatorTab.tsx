/*
 * Copyright (c) 2026 Nexora contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Button, Forms, React, showToast, TextInput, useState } from "@webpack/common";

import { generatePluginFiles, TemplateId } from "../pluginCreator/templates";

function PluginCreatorTab() {
    const [name, setName] = useState("My Plugin");
    const [id, setId] = useState("myPlugin");
    const [description, setDescription] = useState("A custom plugin");
    const [author, setAuthor] = useState("Me");
    const [template, setTemplate] = useState<TemplateId>("hello");
    const [preview, setPreview] = useState("");

    const generate = () => {
        const files = generatePluginFiles({
            id: id.replace(/[^a-zA-Z0-9_-]/g, "") || "myPlugin",
            name,
            description,
            author,
            version: "0.1.0",
            license: "GPL-3.0-or-later",
            template
        });
        setPreview(Object.entries(files).map(([k, v]) => `===== ${k} =====\n${v}`).join("\n"));
        void navigator.clipboard.writeText(files["index.ts"] || "");
        showToast({ text: "Generated — index.ts copied. Put it in src/userplugins/<id>/ then rebuild." });
    };

    return (
        <SettingsTab>
            <Forms.FormTitle tag="h2">Plugin Creator</Forms.FormTitle>
            <Paragraph>Generate a real plugin project. A successful build is not a security proof.</Paragraph>
            <Flex flexDirection="column" gap="0.75em">
                <TextInput value={name} onChange={setName} placeholder="Name" />
                <TextInput value={id} onChange={setId} placeholder="folder id" />
                <TextInput value={description} onChange={setDescription} placeholder="Description" />
                <TextInput value={author} onChange={setAuthor} placeholder="Author" />
                <TextInput value={template} onChange={v => setTemplate(v as TemplateId)} placeholder="hello|settings|command|listener|utility" />
                <Button onClick={generate}>Generate project</Button>
                {preview && (
                    <textarea readOnly style={{ width: "100%", minHeight: 240, fontFamily: "monospace" }} value={preview} />
                )}
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(PluginCreatorTab, "Plugin Creator");
