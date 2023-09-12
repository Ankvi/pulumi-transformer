import { createCorePackage, createModules } from "./modules";
import { createModuleTypeFiles } from "./type-creator";

export async function build() {
    await createModuleTypeFiles();
    await createCorePackage();
    await createModules();
}

export async function createTypes() {
    await createModuleTypeFiles();
}
