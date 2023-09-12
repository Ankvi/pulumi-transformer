import { cp, mkdir, readdir } from "node:fs/promises";
import { AZURE_PATH, OUTPUT_PATH } from "../constants";
import { Module } from "./module";
import { templateLoader } from "./templates/template-loader";

export async function createCorePackage() {
    const corePackageFolder = `${OUTPUT_PATH}/core`;
    await mkdir(corePackageFolder, { recursive: true });

    await templateLoader.writeTemplateToFolder({
        subModule: {
            name: "core",
            outputPath: corePackageFolder,
        },
    });

    await Promise.all([
        cp(`${AZURE_PATH}/utilities.ts`, `${corePackageFolder}/utilities.ts`),
        cp(`${AZURE_PATH}/provider.ts`, `${corePackageFolder}/index.ts`)
    ]);
}

const ignoredFolders = ["scripts", "types"];

export async function createModules() {
    const dirents = await readdir(AZURE_PATH, {
        withFileTypes: true,
    });

    for (const dirent of dirents) {
        if (dirent.isDirectory()) {
            if (ignoredFolders.includes(dirent.name)) {
                continue;
            }

            const subModule = new Module(dirent.name);
            await subModule.copyFiles();
            await templateLoader.writeTemplateToFolder({
                subModule,
                withCoreDeps: true,
            });
        }
    }
}
