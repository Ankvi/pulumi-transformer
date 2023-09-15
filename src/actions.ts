import { cleanOutputPaths, createCorePackage, createModules, getOutputModules } from "./modules";
import { PublishResult } from "./modules/module";

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

export async function publish(options: PublishOptions) {
    const modules = await getOutputModules();

    console.log(`Publishing ${modules.length} packages. Dry run: ${options.dryRun || false}`);

    const results: PublishResult[] = [];
    for (const m of modules) {
        const result = await m.publish(options.dryRun);
        if (!result.success) {
            console.error(result.error);
        }
    }

    const failed = results.filter((x) => !x.success);

    if (failed.length && options.logErrors) {
        console.log("Errors:");
        console.table(failed);
    }
}

export async function unpublish(version: string, options: PublishOptions) {
    const modules = await getOutputModules();

    const unpublishTasks = modules.map((m) => m.unpublish(version, options.dryRun));

    const results = await Promise.all(unpublishTasks);

    const failed = results.filter((x) => !x.success);

    if (failed.length && options.logErrors) {
        console.log("Errors:");
        console.table(failed);
    }
}

export async function listModuleNames() {
    const modules = await getOutputModules();
    console.log("Found modules:");
    console.log("==========================================");
    for (const m of modules) {
        console.log(m.fullName);
    }
}
