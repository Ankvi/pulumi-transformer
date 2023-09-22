import { Octokit } from "@octokit/rest";
import log from "loglevel";

const versionCacheFilePath = `${import.meta.dir}/pulumi-azure-native-version.cache`;

export interface ConfigOptions {
    azureNativeVersion?: string;
    outputVersion?: string;
    outputPath?: string;
}

class Config {
    private azureNativeVersion?: string;
    private outputVersion?: string;
    private outputPath: string;

    private octokit: Octokit;

    constructor() {
        this.octokit = new Octokit();
        this.outputPath = `${import.meta.dir}/../output/packages`;
    }

    public async initialize(options: ConfigOptions) {
        log.debug("Initializing configuration", options);
        const { outputVersion, outputPath, azureNativeVersion } = options;

        await config.setAzureNativeVersion(azureNativeVersion);

        config.setOutputPath(outputPath);

        config.setOutputVersion(outputVersion);
    }

    private async setAzureNativeVersion(version?: string): Promise<void> {
        if (version) {
            if (!version.match(/v\d.\d.\d/)) {
                throw new Error(
                    "Invalid @pulumi/azure-native version. Needs to be in the format 'vX.X.X'",
                );
            }
            this.azureNativeVersion = version;
            return;
        }

        try {
            const cache = await Bun.file(versionCacheFilePath).text();

            const cachedVersion = cache.trim();
            log.debug(`Found cached @pulumi/pulumi-azure-native version: '${cachedVersion}'`);

            this.azureNativeVersion = cachedVersion;
            return;
        } catch (error) {
            log.debug("Retrieving @pulumi/pulumi-azure-native version from GitHub");
        }

        const releasesResponse = await this.octokit.rest.repos.listReleases({
            owner: "pulumi",
            repo: "pulumi-azure-native",
            per_page: 1,
        });

        const releases = releasesResponse.data ?? [];

        if (!releases[0]?.name) {
            throw new Error("No releases found. Unable to set version");
        }

        const releaseVersion = releases[0].name;

        console.debug(`Found @pulumi/azure-native version: '${releaseVersion}'`);

        await Bun.write(versionCacheFilePath, releaseVersion);

        this.azureNativeVersion = releaseVersion;
    }

    public getAzureNativeVersion(): string {
        if (!this.azureNativeVersion) {
            throw new Error("Config has not been initialized");
        }

        return this.azureNativeVersion;
    }

    private setOutputVersion(version?: string): void {
        if (version) {
            if (!version.match(/\d.\d.\d/)) {
                throw new Error("Invalid output version. Needs to be in the format 'X.X.X'");
            }
            this.outputVersion = version;
            return;
        }

        const azureNativeVersion = this.getAzureNativeVersion();
        this.outputVersion = azureNativeVersion.startsWith("v")
            ? azureNativeVersion.substring(1)
            : azureNativeVersion;
    }

    public getOutputVersion(): string {
        if (!this.outputVersion) {
            throw new Error("Config has not been initialized");
        }
        return this.outputVersion;
    }

    private setOutputPath(path?: string): void {
        if (path) {
            this.outputPath = path;
        }
    }

    public getOutputPath(): string {
        return this.outputPath;
    }
}

export const config = new Config();
