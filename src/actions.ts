import { createCorePackage, createModules, getOutputModuleNames } from "./modules";
import { PublishOptions, publishPackages, unpublishPackages } from "./publishing";

import { createModuleTypeFiles } from "./type-creating";

export async function build() {
    await createModuleTypeFiles();
    await createCorePackage();
    await createModules();
}

export async function createTypes() {
    await createModuleTypeFiles();
}

export async function publish(options: PublishOptions) {
    await publishPackages({ dryRun: true });
}

export async function unpublish(version: string, options: PublishOptions) {
    await unpublishPackages(version, options);
}

export async function listModuleNames() {
    const modules = await getOutputModuleNames();
    console.log("Found modules:");
    console.log("==============");
    for (const name of modules) {
        console.log(name);
    }
}
