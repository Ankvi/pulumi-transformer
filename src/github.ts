import { Octokit } from "@octokit/rest";
import { PackageJson } from "./modules/templates/types";

const octokit = new Octokit();
type Release = Awaited<ReturnType<(typeof octokit)["rest"]["repos"]["getLatestRelease"]>>["data"];

let latestRelease: Promise<Release> | null = null;

export async function getLatestRelease() {
    if (latestRelease) {
        return latestRelease;
    }

    latestRelease = octokit.rest.repos
        .getLatestRelease({
            owner: "pulumi",
            repo: "pulumi-azure-native",
            per_page: 1,
        })
        .then((response) => response.data);

    return latestRelease;
}

export async function getLatestReleaseChangelog() {
    const latestRelease = await getLatestRelease();
    return latestRelease.body;
}

export async function getLatestBuildVersion(): Promise<string> {
    const response = await fetch(
        "https://raw.githubusercontent.com/Ankvi/pulumi-azure-native/main/packages/aad/package.json",
    );
    const pkg = (await response.json()) as PackageJson;
    return pkg.version;
}
