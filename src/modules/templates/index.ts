import { Octokit } from "@octokit/rest";
import { cp } from "node:fs/promises";
import { PackageJson } from "./types";
import { MODULE_PREFIX } from "../../constants";

type WriteOptions = {
    subModule: IModule;
    withCoreDeps?: boolean;
};

export interface IModule {
    name: string;
    outputPath: string;
}

const versionCacheFilePath = `${import.meta.dir}/pulumi-azure-native-version.txt`;

class TemplateLoader {
    private readmeTemplate?: string;
    private version: Promise<string>;

    private octokit: Octokit;

    constructor() {
        this.octokit = new Octokit();

        this.version = this.getVersion();
    }

    private async getVersion(): Promise<string> {
        try {
            const cache = await Bun.file(versionCacheFilePath).text();

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

        if (!releases[0]?.name) {
            throw new Error("No releases found. Unable to set version");
        }

        const version = releases[0].name;

        console.debug(`Found @pulumi/azure-native version: '${version}'`);

        await Bun.write(versionCacheFilePath, version);

        return version;
    }

    private async getPackageJson(name: string, withCoreDeps = false): Promise<string> {
        const version = await this.version;

        const template: PackageJson = {
            name: `${MODULE_PREFIX}${name}`,
            version: version.startsWith("v") ? version.substring(1) : version,
            description: `Pulumi Azure Native package for ${name}`,
            keywords: ["pulumi", "azure", "azure-native", "category/cloud", "kind/native"],
            homepage: "https://pulumi.com",
            repository: {
                url: "git+https://github.com/Ankvi/pulumi-azure-native.git",
                type: "git",
            },
            dependencies: {
                "@pulumi/pulumi": "^3.0.0",
            },
            publishConfig: {
                access: "public",
            },
            devDependencies: {
                typescript: "^5.0.0",
                "@types/node": "^20.0.0",
            },
            scripts: {
                build: "tsc",
                lint: "tsc --noEmit",
                prepublish: "test -f index.js",
            },
        };

        if (name === "core") {
            template.scripts[
                "install"
            ] = `node scripts/install-pulumi-plugin.js resource azure-native ${version}`;
        }

        if (withCoreDeps) {
            template.dependencies[`${MODULE_PREFIX}core`] = "workspace:^"; //version;
        }

        return JSON.stringify(template, null, 4);
    }

    private async getReadme(name: string): Promise<string> {
        if (!this.readmeTemplate) {
            this.readmeTemplate = await Bun.file(`${import.meta.dir}/README.template.md`).text();
        }

        return this.readmeTemplate.replace("${NAME}", name);
    }

    private getTsConfig(): string {
        return JSON.stringify(
            {
                extends: "../../tsconfig",
                include: ["**/*.ts"],
                exclude: ["node_modules", "**/*.d.ts"],
            },
            null,
            4,
        );
    }

    public async writeTemplateToFolder({ subModule, withCoreDeps }: WriteOptions): Promise<void> {
        const folder = subModule.outputPath;

        const packageJson = await this.getPackageJson(subModule.name, withCoreDeps);
        const readme = await this.getReadme(subModule.name);

        await Promise.all([
            await Bun.write(`${folder}/package.json`, packageJson),
            await Bun.write(`${folder}/README.md`, readme),
            await Bun.write(`${folder}/tsconfig.json`, this.getTsConfig()),
            await cp(`${import.meta.dir}/.npmignore`, `${folder}/.npmignore`),
        ]);
    }
}

export const loader = new TemplateLoader();
