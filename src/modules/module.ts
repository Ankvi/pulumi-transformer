import { Dirent } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { AZURE_PATH, MODULE_PREFIX, getOutputPath } from "../constants";
import { IModule } from "./templates";
import { execa } from "../helpers/execa";

export type PublishResult = {
    name: string;
    success: boolean;
    error?: string;
};

const commonModuleImports = [
    'import * as pulumi from "@pulumi/pulumi";',
    `import * as utilities from "${MODULE_PREFIX}core/utilities";`,
];

export class Module implements IModule {
    private path: string;
    public readonly outputPath: string;
    public readonly fullName: `${typeof MODULE_PREFIX}${string}`;

    constructor(public readonly name: string) {
        this.path = `${AZURE_PATH}/${this.name}`;
        this.outputPath = `${getOutputPath()}/${this.name}`;
        this.fullName = `${MODULE_PREFIX}${this.name}`;
    }

    public async createFolder(): Promise<void> {
        await mkdir(this.outputPath, { recursive: true });
    }

    public async copyFiles(): Promise<void> {
        await this.createFolder();

        const files = await readdir(this.path, {
            withFileTypes: true,
        });

        for (const file of files) {
            if (file.isFile()) {
                await this.writeModuleFile(file);
            } else if (file.isDirectory()) {
                await this.writeSubModuleFiles(file);
            } else {
                throw new Error("Unknown file type: " + file.name);
            }
        }
    }

    public async publish(dryRun?: boolean): Promise<PublishResult> {
        console.info(`Publishing package: ${this.fullName}`);
        const publishArgs: string[] = [];
        if (dryRun) {
            publishArgs.push("--dry-run");
        } /* else if (!process.env.NPM_OTP) {
            throw new Error(
                "NPM publish requires an OTP. Provide one by setting the NPM_OTP environment variable",
            );
        } else {
            publishArgs.push("--otp");
            publishArgs.push(process.env.NPM_OTP);
        }*/
        try {
            await execa(`npm publish ${publishArgs.join(" ")}`, {
                cwd: this.outputPath,
            });
            return {
                name: this.fullName,
                success: true,
            };
        } catch (error) {
            return {
                name: this.fullName,
                success: false,
                error: error.message,
            };
        }
    }

    public async unpublish(version: string, dryRun?: boolean): Promise<PublishResult> {
        console.log(`Unpublishing package: ${this.fullName}`);
        try {
            await execa(`npm unpublish ${this.fullName}@${version}  ${dryRun ? "--dry-run" : ""}`);
            return {
                name: this.fullName,
                success: true,
            };
        } catch (error) {
            return {
                name: this.fullName,
                success: false,
                error: error.message,
            };
        }
    }

    private async writeModuleFile(file: Dirent) {
        const content = await readFile(`${this.path}/${file.name}`, "utf-8");

        let newContent = this.replaceCommonModuleFileContent(content);

        if (file.name === "index.ts") {
            newContent = newContent.replace(
                `export * from "../types/enums/${this.name}";`,
                'export * from "./types/enums";',
            );
        }

        const imports = [...commonModuleImports];

        if (
            newContent.includes(`types.inputs.${this.name}.`) ||
            newContent.includes(`types.outputs.${this.name}.`) ||
            newContent.includes("types.enums.")
        ) {
            imports.push('import * as types from "./types";');
        }

        await writeFile(
            `${this.outputPath}/${file.name}`,
            `${imports.join("\n")}\n${newContent}`,
            "utf-8",
        );
    }

    private async writeSubModuleFile(subFolder: Dirent, file: Dirent) {
        const content = await readFile(`${this.path}/${subFolder.name}/${file.name}`, "utf-8");

        let newContent = this.replaceCommonModuleFileContent(content); /*.replaceAll(
            `../types/enums/${this.name}`,
            "./types/enums",
        );*/

        if (file.name === "index.ts") {
            newContent = newContent.replace(
                `export * from "../../types/enums/${this.name}/${subFolder.name}";`,
                `export * from "../types/enums/${subFolder.name}";`,
            );
        }

        const imports = [...commonModuleImports];

        if (
            newContent.includes(`types.inputs.${this.name}.${subFolder.name}.`) ||
            newContent.includes(`types.outputs.${this.name}.${subFolder.name}.`) ||
            newContent.includes("types.enums.")
        ) {
            imports.push('import * as types from "../types";');
        }

        await writeFile(
            `${this.outputPath}/${subFolder.name}/${file.name}`,
            `${imports.join("\n")}\n${newContent}`,
            "utf-8",
        );
    }

    private async writeSubModuleFiles(subFolder: Dirent) {
        const subVersionFiles = await readdir(`${this.path}/${subFolder.name}`, {
            withFileTypes: true,
        });

        await mkdir(`${this.outputPath}/${subFolder.name}`);

        await Promise.all(
            subVersionFiles.map(async (file) => {
                await this.writeSubModuleFile(subFolder, file);
            }),
        );
    }
    private replaceCommonModuleFileContent(content: string): string {
        return (
            content
                // Remove all existing import statements. We'll replace those
                .replaceAll(/import\s\*\sas\s\w+\sfrom\s"[a-z@./-]+";/g, "")

                // Remove generation warnings from Pulumi
                .replaceAll(/\/\/\s\*\*\*\s.*/g, "")

                // Wrap all references to types in types variable
                .replaceAll(`enums.${this.name}`, "types.enums")
                .replaceAll(`inputs.${this.name}.`, `types.inputs.${this.name}.`)
                .replaceAll(`outputs.${this.name}.`, `types.outputs.${this.name}.`)
                .trimStart()
        );
    }
}
