import { readdir } from "node:fs/promises";
import { OUTPUT_PATH } from "./constants";
import { exec } from "node:child_process";

export type PublishOptions = {
    dryRun?: boolean;
    logErrors?: boolean;
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
