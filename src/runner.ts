import { writeChangelogToOutput } from "./changelog";
import { exit } from "process";
import { config } from "./config";
import { resolve } from "path";
import { createCorePackage, createModules } from "./modules";
import { createModuleTypeFiles, createSubModuleTypeFiles } from "./type-creating";
import { Shell } from "bun";
import { rm } from "node:fs/promises";

export type BuildOptions = {
    commit?: boolean;
    submodules?: boolean;
};

export class Runner {
    private outputBasePath: string;
    private $: Shell;

    constructor() {
        this.outputBasePath = resolve(`${config.getOutputPath()}/..`);
        this.$ = Bun.$.cwd(this.outputBasePath).throws(true);
    }

    public async build(options: BuildOptions) {
        await this.prepareOutputPath();

        console.log("Creating type files");
        await createModuleTypeFiles();

        if (options.submodules) {
            console.log("Creating submodule files");
            await createSubModuleTypeFiles();
        }

        console.log("Creating core module");
        await createCorePackage();

        console.log("Creating other modules");
        await createModules(options.submodules);

        await writeChangelogToOutput();

        if (options.commit) {
            await this.commitOutput();
        }
    }

    private async prepareOutputPath() {
        await this.$`git pull`;

        console.log("Removing old output");
        await rm(config.getOutputPath(), { recursive: true });
    }

    private async commitOutput() {
        const version = config.getOutputVersion();

        const outputBasePath = resolve(`${config.getOutputPath()}/..`);

        console.log("Committing result to GitHub");
        console.log("Current working directory:", outputBasePath);

        try {
            const branch = `release/${version}`;
            await this.$`pnpm install`;
            await this.$`git checkout -b ${branch}`;
            await this.$`git add -A`;
            await this.$`git commit -m "Release ${version}"`;
            // await this.$`git push`;
            await this.$`git push -u origin ${branch}`;
        } catch (err) {
            console.error(err);
            exit(1);
        }
    }
}
