import log from "loglevel";
import { getLatestRelease } from "./github";

const versionCacheFilePath = `${import.meta.dir}/pulumi-azure-native-version.cache`;

export async function getCachedPulumiAzureNativeVersion() {
    const cache = await Bun.file(versionCacheFilePath).text();

    const cachedVersion = cache.trim();

    return cachedVersion;
}

export interface ConfigOptions {
    azureNativeVersion?: string;
    outputVersion?: string;
    outputPath?: string;
    cache: boolean;
}

class Config {
    private azureNativeVersion?: string;
    private outputVersion?: string;
    private outputPath: string;
    private useCache: boolean = true;

    constructor() {
        this.outputPath = `${import.meta.dir}/../output/packages`;
    }

    public async initialize(options: ConfigOptions) {
        log.debug("Initializing configuration", options);
        const { outputVersion, outputPath, azureNativeVersion, cache } = options;
        this.useCache = cache;

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
            if (this.useCache) {
                const cachedVersion = await getCachedPulumiAzureNativeVersion();

                log.debug(`Found cached @pulumi/pulumi-azure-native version: '${cachedVersion}'`);

                this.azureNativeVersion = cachedVersion;
                return;
            }
        } catch (error) {
            log.debug("Retrieving @pulumi/pulumi-azure-native version from GitHub");
        }

        const release = await getLatestRelease();
        if (!release?.name) {
            throw new Error("No releases found");
        }

        const releaseVersion = release.name;

        log.info(`Found @pulumi/azure-native version: '${releaseVersion}'`);

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
