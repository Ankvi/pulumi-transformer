import { exit } from "process";
import { ConfigOptions, config } from "./config";
import { getLatestBuildVersion, getLatestRelease } from "./github";
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

    if (options.commit) {
        commitOutput();
    }
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

export async function checkVersion() {
    const latestBuild = await getLatestBuildVersion();
    const latestRelease = await getLatestRelease();
    const latestVersion = latestRelease?.name?.substring(1) ?? "";
    if (latestVersion <= latestBuild) {
        console.log("No new version found");
        exit(-1);
    }
    console.log(`A new version exists: ${latestVersion}`);
}

function commitOutput() {
    const version = config.getOutputVersion();

    const outputBasePath = `${config.getOutputPath()}/..`;

    try {
        Bun.spawnSync(["pnpm", "install"], {
            cwd: outputBasePath,
        });
        Bun.spawnSync(["git", "add", "-A"], {
            cwd: outputBasePath,
        });
        Bun.spawnSync(["git", "commit", "-m", `Bumped to ${version}`], {
            cwd: outputBasePath,
        });
    } catch (err) {
        console.error(err);
        exit(1);
    }
}
