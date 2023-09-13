import { Dirent } from "node:fs";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { AZURE_PATH, MODULE_PREFIX, OUTPUT_PATH, TYPES_FOLDER } from "../constants";
import { IModule } from "./templates/template-loader";

export class Module implements IModule {
    private path: string;
    public readonly outputPath: string;

    constructor(
        public readonly name: string
    ) {
        this.path = `${AZURE_PATH}/${this.name}`;
        this.outputPath = `${OUTPUT_PATH}/${this.name}`;

    }

    public async copyFiles(): Promise<void> {
        await mkdir(this.outputPath, { recursive: true });

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

        // await this.copyTypes();
    }

    private async copyTypes(): Promise<void> {
        try {
            await cp(`${TYPES_FOLDER}/${this.name}`, `${this.outputPath}/types`, { recursive: true });
        } catch (error) {
            console.warn(`No types for module: '${this.name}'`);
        }
    }

    private async writeModuleFile(
        file: Dirent,
    ) {
        const content = await readFile(`${this.path}/${file.name}`, "utf-8");
        const newContent = content
            .replaceAll("../utilities", `${MODULE_PREFIX}core/utilities`)
            .replaceAll("../types", "./types");

        await writeFile(`${this.outputPath}/${file.name}`, newContent, "utf-8");
    }

    private async writeSubModuleFile(subFolder: Dirent, file: Dirent) {
        const content = await readFile(
            `${this.path}/${subFolder.name}/${file.name}`,
            "utf-8",
        );
        const newContent = content
            .replaceAll("../../utilities", `${MODULE_PREFIX}core/utilities`)
            .replaceAll("../../types", "../types");

        await writeFile(`${this.outputPath}/${subFolder.name}/${file.name}`, newContent, "utf-8");
    }

    private async writeSubModuleFiles(subFolder: Dirent) {
        const subVersionFiles = await readdir(
            `${this.path}/${subFolder.name}`,
            {
                withFileTypes: true,
            },
        );

        await mkdir(`${this.outputPath}/${subFolder.name}`);

        await Promise.all(
            subVersionFiles.map(async (file) => {
                await this.writeSubModuleFile(subFolder, file);
            }),
        );
    }
}
