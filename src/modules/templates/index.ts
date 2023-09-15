import { Octokit } from "@octokit/rest";
import { readFileSync } from "node:fs";
import { writeFile, cp, readFile } from "node:fs/promises";
import { PackageJson } from "./types";
import { AZURE_PATH, MODULE_PREFIX } from "../../constants";

type WriteOptions = {
    subModule: IModule;
    withCoreDeps?: boolean;
};

export interface IModule {
    name: string;
    outputPath: string;
}

const versionCacheFilePath = `${__dirname}/pulumi-azure-native-version.txt`;

class TemplateLoader {
    private template: string;
    private readmeTemplate?: string;
    private version: Promise<string>;

    private octokit: Octokit;

    constructor() {
        this.template = readFileSync(`${__dirname}/package.template.json`, "utf-8");

        this.octokit = new Octokit();

        this.version = this.getVersion();
    }

    private async getVersion(): Promise<string> {
        try {
            const cache = await readFile(versionCacheFilePath, {
                encoding: "utf-8",
            });

            const cachedVersion = cache.trim();
            console.debug(`Found cached @pulumi/pulumi-azure-native version: '${cachedVersion}'`);
            return cachedVersion;
        } catch (error) {
            console.debug("Retrieving @pulumi/pulumi-azure-native version from GitHub");
        }

        const releasesResponse = await this.octokit.rest.repos.listReleases({
            owner: "pulumi",
            repo: "pulumi-azure-native",
            per_page: 1,
        });

        const releases = releasesResponse.data ?? [];

        if (!releases.length) {
            throw new Error("No releases found. Unable to set version");
        }

        const version = releases[0].name;

        console.debug(`Found @pulumi/azure-native version: '${version}'`);

        await writeFile(versionCacheFilePath, version);

        return version;
    }

    private async getTemplate(name: string, withCoreDeps = false): Promise<PackageJson> {
        const version = await this.version;

        const template = JSON.parse(
            this.template
                .replaceAll("${PACKAGE_NAME}", `${MODULE_PREFIX}${name}`)
                .replaceAll("${NAME}", name)
                .replaceAll("${VERSION}", version),
        ) as PackageJson;

        if (withCoreDeps) {
            template.dependencies[`${MODULE_PREFIX}core`] = "workspace:^"; //version;
        }

        return template;
    }

    private async getReadme(name: string): Promise<string> {
        if (!this.readmeTemplate) {
            this.readmeTemplate = await readFile(`${__dirname}/README.template.md`, {
                encoding: "utf-8",
            });
        }

        return this.readmeTemplate.replace("${NAME}", name);
    }

    public async writeTemplateToFolder({ subModule, withCoreDeps }: WriteOptions): Promise<void> {
        const folder = subModule.outputPath;

        const template = await this.getTemplate(subModule.name, withCoreDeps);
        const readme = await this.getReadme(subModule.name);

        await Promise.all([
            await writeFile(`${folder}/package.json`, JSON.stringify(template, null, 4), "utf-8"),
            await writeFile(`${folder}/README.md`, readme),
            await cp(`${AZURE_PATH}/scripts`, `${folder}/scripts`, { recursive: true }),
            await cp(`${__dirname}/.npmignore`, `${folder}/.npmignore`),
            await cp(`${__dirname}/tsconfig.template.json`, `${folder}/tsconfig.json`),
        ]);
    }
}

export const loader = new TemplateLoader();
