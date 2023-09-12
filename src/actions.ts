import { createCorePackage, createModules } from "./modules";
import { publishPackages } from "./publishing";

import { createModuleTypeFiles } from "./type-creator";

export async function build() {
    await createModuleTypeFiles();
    await createCorePackage();
    await createModules();
}

export async function createTypes() {
    await createModuleTypeFiles();
}

export async function publish() {
    await publishPackages({});
}
