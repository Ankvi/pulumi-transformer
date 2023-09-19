import { Dirent } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { AZURE_PATH, MODULE_PREFIX, getOutputPath } from "../constants";
import { IModule } from "./templates";

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
            newContent.includes(`types.inputs.`) ||
            newContent.includes(`types.outputs.`) ||
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

        let newContent = this.replaceCommonModuleFileContent(content);

        if (file.name === "index.ts") {
            newContent = newContent.replace(
                `export * from "../../types/enums/${this.name}/${subFolder.name}";`,
                `export * from "./types/enums";`,
            );
        }

        const imports = [...commonModuleImports];

        if (
            newContent.includes(`types.inputs.${subFolder.name}.`) ||
            newContent.includes(`types.outputs.${subFolder.name}.`) ||
            newContent.includes("types.enums.")
        ) {
            imports.push('import * as types from "./types";');
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
                .replaceAll(`inputs.${this.name}.`, `types.inputs.`)
                .replaceAll(`outputs.${this.name}.`, `types.outputs.`)
                .trimStart()
        );
    }
}
