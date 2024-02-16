import { getLatestReleaseChangelog } from "../github";
import { config } from "../config";
import { resolve } from "path";

export async function writeChangelogToOutput() {
    const changelog = await getLatestReleaseChangelog();
    const releaseTag = config.getAzureNativeVersion();
    const outputChangelog = resolve(`${config.getOutputPath()}/../CHANGELOG.md`);
    if (changelog) {
        await Bun.write(outputChangelog, changelog);
    } else {
        const emptyChangeLog = await Bun.file(`${import.meta.dir}/EMPTY_CHANGELOG.md`).text();
        await Bun.write(outputChangelog, emptyChangeLog.replace("{{RELEASE_TAG}}", releaseTag));
    }
}
