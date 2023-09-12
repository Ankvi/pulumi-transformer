import { readdir } from "node:fs/promises";
import { BUILD_PATH, OUTPUT_PATH } from "./constants";
import { exec } from "node:child_process";
import { templateLoader } from "./modules/templates/template-loader";

type PublishOptions = {
    dryRun?: boolean;
    logErrors?: boolean;
}

export async function preparePackagesForPublishing() {
   const packages = await readdir(BUILD_PATH, {
        withFileTypes: true
    });

    await Promise.all(packages.map(p => templateLoader.writeTemplateToFolder({
        subModule: {
            name: p.name,
            outputPath: p.path
        },
        withCoreDeps: p.name !== "core"
    })));
}

export async function publishPackages({ dryRun, logErrors }: PublishOptions) {
    const folders = await readdir(OUTPUT_PATH, {
        withFileTypes: true,
    });

    const publishTasks: Promise<boolean>[] = [];

    const errors: string[] = [];

    for (const folder of folders) {
        if (folder.isDirectory()) {
            publishTasks.push(
                new Promise<boolean>((resolve) => {
                    exec(
                        `npm publish ${dryRun ? "--dry-run" : ""}`,
                        {
                            cwd: `${OUTPUT_PATH}/${folder.name}`,
                        },
                        (err, stdout, stderr) => {
                            if (err) {
                                errors.push(err.message);
                            }
                            resolve(true);
                        }
                    );
                })
            );
        }
    }

    await Promise.all(publishTasks);

    if (errors.length && logErrors) {
        console.log("Errors:");
        console.log(errors.join("\n"));
    }
}
