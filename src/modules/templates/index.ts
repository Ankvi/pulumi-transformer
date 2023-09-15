import { Octokit } from "@octokit/rest";
import { writeFile, cp, readFile, mkdir } from "node:fs/promises";
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
    private readmeTemplate?: string;
    private version: Promise<string>;

    private octokit: Octokit;

    constructor() {
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
                install: `node scripts/install-pulumi-plugin.js resource azure-native ${version}`,
                prepublish: "pnpm run build",
            },
        };

        if (withCoreDeps) {
            template.dependencies[`${MODULE_PREFIX}core`] = "workspace:^"; //version;
        }

        return JSON.stringify(template, null, 4);
    }

    private async getReadme(name: string): Promise<string> {
        if (!this.readmeTemplate) {
            this.readmeTemplate = await readFile(`${__dirname}/README.template.md`, {
                encoding: "utf-8",
            });
        }

        return this.readmeTemplate.replace("${NAME}", name);
    }

    private getTsConfig(): string {
        return JSON.stringify(
            {
                compilerOptions: {
                    target: "ES2016",
                    module: "CommonJS",
                    skipLibCheck: true,
                    skipDefaultLibCheck: true,
                    moduleResolution: "node",
                    declaration: true,
                    inlineSourceMap: true,
                    experimentalDecorators: true,
                    forceConsistentCasingInFileNames: true,
                    strict: true,
                },
                include: ["**/*.ts"],
                exclude: ["node_modules", "**/*.d.ts"],
            },
            null,
            4,
        );
    }

    private async addInstallScript(folder: string): Promise<void> {
        const scriptFolder = `${folder}/scripts`;
        await mkdir(scriptFolder, { recursive: true });
        await cp(
            `${__dirname}/install-pulumi-plugin.js`,
            `${scriptFolder}/install-pulumi-plugin.js`,
        );
    }

    public async writeTemplateToFolder({ subModule, withCoreDeps }: WriteOptions): Promise<void> {
        const folder = subModule.outputPath;

        const packageJson = await this.getPackageJson(subModule.name, withCoreDeps);
        const readme = await this.getReadme(subModule.name);

        await Promise.all([
            await writeFile(`${folder}/package.json`, packageJson, "utf-8"),
            await writeFile(`${folder}/README.md`, readme),
            await writeFile(`${folder}/tsconfig.json`, this.getTsConfig(), "utf-8"),
            await cp(`${__dirname}/.npmignore`, `${folder}/.npmignore`),
            await this.addInstallScript(folder),
        ]);
    }
}

export const loader = new TemplateLoader();
