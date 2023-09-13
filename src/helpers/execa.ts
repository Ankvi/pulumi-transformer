import { ExecOptions, exec } from "node:child_process"

export function execa(cmd: string, options: ExecOptions) {
    return new Promise((resolve, reject) => {
        exec(cmd, options, (err, stdout, stderr) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(stdout);
        });
    })
}
