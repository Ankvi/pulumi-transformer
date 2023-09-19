import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { AZURE_PATH } from "../constants";
import { Module } from "./module";
import { loader } from "./templates";

export async function cleanOutputPaths() {
    const modules = await getOutputModules();
    await Promise.all(modules.map((m) => rm(m.outputPath, { recursive: true })));
}

export async function createCorePackage() {
    const coreModule = new Module("core");
    await coreModule.createFolder();

    await loader.writeTemplateToFolder({
        subModule: coreModule,
    });

    const scriptFolder = `${coreModule.outputPath}/scripts`;
    await mkdir(scriptFolder, { recursive: true });
    await cp(
        `${import.meta.dir}/templates/install-pulumi-plugin.js`,
        `${scriptFolder}/install-pulumi-plugin.js`,
    );

    const indexFile = await Bun.file(`${AZURE_PATH}/index.ts`).text();

    // Filter out import/export statements for submodules
    const exports = indexFile.substring(
        indexFile.indexOf("// Export sub-modules"),
        indexFile.indexOf("pulumi.runtime.registerResourcePackage"),
    );
    const formattedIndexFile = indexFile.replace(exports, "");

    await Promise.all([
        Bun.write(`${coreModule.outputPath}/index.ts`, formattedIndexFile),
        cp(`${AZURE_PATH}/utilities.ts`, `${coreModule.outputPath}/utilities.ts`),
        cp(`${AZURE_PATH}/provider.ts`, `${coreModule.outputPath}/provider.ts`),
    ]);
}

const ignoredFolders = ["scripts", "types"];

export async function createModules() {
    const modules = await getAzureModules();

    const buildTasks = modules.map(async (name) => {
        const subModule = new Module(name);
        await subModule.copyFiles();
        await loader.writeTemplateToFolder({
            subModule,
            withCoreDeps: true,
        });
    });

    await Promise.all(buildTasks);
}

async function getAzureModules(): Promise<string[]> {
    const dirents = await readdir(AZURE_PATH, {
        withFileTypes: true,
    });

    return dirents
        .filter((x) => x.isDirectory() && !ignoredFolders.includes(x.name))
        .map((x) => x.name);
}

export async function getOutputModules(): Promise<Module[]> {
    const modules = await getAzureModules();
    return ["core", ...modules].map((x) => new Module(x));
}
