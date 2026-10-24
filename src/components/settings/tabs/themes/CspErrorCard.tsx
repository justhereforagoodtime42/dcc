/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Divider } from "@components/Divider";
import { ErrorCard } from "@components/ErrorCard";
import { Link } from "@components/Link";
import { CspBlockedUrls, useCspErrors } from "@utils/cspViolations";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { promptToRestart } from "@utils/promptToRestart";
import { useForceUpdater } from "@utils/react";
import { Button, Forms, showToast } from "@webpack/common";

export function CspErrorCard() {
    if (IS_WEB) return null;

    const errors = useCspErrors();
    const forceUpdate = useForceUpdater();

    if (!errors.length) return null;

    const isImgurHtmlDomain = (url: string) => url.startsWith("https://imgur.com/");

    const allowUrl = async (url: string) => {
        const { origin: baseUrl, host } = new URL(url);

        const result = await VencordNative.csp.requestAddOverride(
            baseUrl,
            ["connect-src", "img-src", "style-src", "font-src"],
            "Nexora Themes"
        );

        if (result === "cancelled") return;
        if (result === "unchecked") {
            showToast({ text: "You must check the trust box to allow this host", variant: "critical" });
            return;
        }
        if (result === "invalid") {
            showToast({ text: "Could not allow that URL", variant: "critical" });
            return;
        }
        // "ok" or already-allowed path — clear matching blocks and restart
        CspBlockedUrls.forEach(blocked => {
            try {
                if (new URL(blocked).host === host) CspBlockedUrls.delete(blocked);
            } catch { /* ignore */ }
        });

        forceUpdate();
        promptToRestart("relaunch");
    };

    const hasImgurHtmlDomain = errors.some(isImgurHtmlDomain);

    return (
        <ErrorCard>
            <Forms.FormTitle tag="h5">Blocked Resources</Forms.FormTitle>
            <Forms.FormText>
                Some images, styles, or fonts were blocked because they come from disallowed domains.
            </Forms.FormText>
            <Forms.FormText>
                Click <strong>Allow</strong> if you trust the host (needed for theme background JPGs, etc.), then fully restart Discord.
            </Forms.FormText>
            <Forms.FormText>
                After allowing a domain, fully close Discord (tray / task manager) and reopen for the change to apply.
            </Forms.FormText>

            <Forms.FormTitle tag="h5" className={classes(Margins.top16, Margins.bottom8)}>Blocked URLs</Forms.FormTitle>
            <div className="vc-settings-csp-list">
                {errors.map((url, i) => (
                    <div key={url}>
                        {i !== 0 && <Divider className={Margins.bottom8} />}
                        <div className="vc-settings-csp-row">
                            <Link href={url}>{url}</Link>
                            <Button color={Button.Colors.PRIMARY} onClick={() => allowUrl(url)} disabled={isImgurHtmlDomain(url)}>
                                Allow
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {hasImgurHtmlDomain && (
                <>
                    <Divider className={classes(Margins.top8, Margins.bottom16)} />
                    <Forms.FormText>
                        Imgur links should be direct links in the form of <code>https://i.imgur.com/...</code>
                    </Forms.FormText>
                    <Forms.FormText>To obtain a direct link, right-click the image and select "Copy image address".</Forms.FormText>
                </>
            )}
        </ErrorCard>
    );
}
