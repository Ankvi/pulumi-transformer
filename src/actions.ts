import { ConfigOptions, config } from "./config";
import { cleanOutputPaths, createCorePackage, createModules, getOutputModules } from "./modules";
import { createModuleTypeFiles } from "./type-creating";

export type ActionOptions = {
    verbose?: boolean;
};

type BuildOptions = ActionOptions & ConfigOptions;

export async function build(options: BuildOptions) {
    await config.initialize(options);

    console.log("Removing old output");
    await cleanOutputPaths();

    console.log("Creating type files");
    await createModuleTypeFiles();

    console.log("Creating core module");
    await createCorePackage();

    console.log("Creating other modules");
    await createModules();
}

export type PublishOptions = {
    dryRun?: boolean;
    logErrors?: boolean;
};

export async function listModuleNames(options: ActionOptions) {
    const modules = await getOutputModules();
    console.log("Found modules:");
    console.log("==========================================");
    for (const m of modules) {
        console.log(m.fullName);
    }
}
