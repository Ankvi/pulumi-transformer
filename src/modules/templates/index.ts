import { Octokit } from "@octokit/rest";
import { cp } from "node:fs/promises";
import { PackageJson } from "./types";
import { MODULE_PREFIX } from "../../constants";
import { config } from "../../config";

type WriteOptions = {
    subModule: IModule;
    withCoreDeps?: boolean;
};

export interface IModule {
    name: string;
    outputPath: string;
}

class TemplateLoader {
    private readmeTemplate?: string;

    private getPackageJson(name: string, withCoreDeps = false): string {
        const template: PackageJson = {
            name: `${MODULE_PREFIX}${name}`,
            version: config.getOutputVersion(),
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
            ] = `node scripts/install-pulumi-plugin.js resource azure-native ${config.getAzureNativeVersion()}`;
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

        const packageJson = this.getPackageJson(subModule.name, withCoreDeps);
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
