import { Octokit } from "@octokit/rest";

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
