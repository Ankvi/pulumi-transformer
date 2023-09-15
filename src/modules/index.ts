import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { AZURE_PATH, MODULE_PREFIX, OUTPUT_PATH } from "../constants";
import { Module } from "./module";
import { loader } from "./templates";

export async function createCorePackage() {
    const corePackageFolder = `${OUTPUT_PATH}/core`;
    await mkdir(corePackageFolder, { recursive: true });

    await loader.writeTemplateToFolder({
        subModule: {
            name: "core",
            outputPath: corePackageFolder,
        },
    });

    const indexFile = await readFile(`${AZURE_PATH}/index.ts`, { encoding: "utf-8" });
    // Filter out import/export statements for submodules
    // const startOfSubModules = indexFile.indexOf("// Export sub-modules");
    const exports = indexFile.substring(
        indexFile.indexOf("// Export sub-modules"),
        indexFile.indexOf("pulumi.runtime.registerResourcePackage"),
    );

    await Promise.all([
        writeFile(`${corePackageFolder}/index.ts`, indexFile.replace(exports, "")),
        cp(`${AZURE_PATH}/utilities.ts`, `${corePackageFolder}/utilities.ts`),
        cp(`${AZURE_PATH}/provider.ts`, `${corePackageFolder}/provider.ts`),
    ]);
}

const ignoredFolders = ["scripts", "types"];

export async function createModules() {
    const modules = await getAzureModules();

    for (const name of modules) {
        const subModule = new Module(name);
        await subModule.copyFiles();
        await loader.writeTemplateToFolder({
            subModule,
            withCoreDeps: true,
        });
    }
}

async function getAzureModules(): Promise<string[]> {
    const dirents = await readdir(AZURE_PATH, {
        withFileTypes: true,
    });

    return dirents
            .filter((x) => x.isDirectory() && !ignoredFolders.includes(x.name))
            .map((x) => x.name);
}


export async function getOutputModuleNames(): Promise<string[]> {
    const modules = await getAzureModules();
    return ["core", ...modules].map((x) => `${MODULE_PREFIX}${x}`);
}
