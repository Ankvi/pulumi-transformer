import { cleanOutputPaths, createCorePackage, createModules, getOutputModules } from "./modules";

import { createModuleTypeFiles } from "./type-creating";

type BuildOptions = {
    output?: string;
};

export async function build(options: BuildOptions) {
    if (options.output) {
        process.env.OUTPUT_PATH = options.output;
    }

    await cleanOutputPaths();
    await createModuleTypeFiles();
    await createCorePackage();
    await createModules();
}

export type PublishOptions = {
    dryRun?: boolean;
    logErrors?: boolean;
};

export async function listModuleNames() {
    const modules = await getOutputModules();
    console.log("Found modules:");
    console.log("==========================================");
    for (const m of modules) {
        console.log(m.fullName);
    }
}
