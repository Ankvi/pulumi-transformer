import { Octokit } from "@octokit/rest";
import { PackageJson } from "./modules/templates/types";

const octokit = new Octokit();

export async function getLatestRelease() {
    const releasesResponse = await octokit.rest.repos.listReleases({
        owner: "pulumi",
        repo: "pulumi-azure-native",
        per_page: 1,
    });

    const releases = releasesResponse.data ?? [];

    return releases[0];
}

export async function getLatestBuildVersion(): Promise<string> {
    const response = await fetch(
        "https://raw.githubusercontent.com/Ankvi/pulumi-azure-native/main/packages/aad/package.json",
    );
    const pkg = await response.json<PackageJson>();
    return pkg.version;
}
