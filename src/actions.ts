import { createCorePackage, createModules, transpile } from "./modules";
import { PublishOptions, publishPackages } from "./publishing";

import { createModuleTypeFiles } from "./type-creator";

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
