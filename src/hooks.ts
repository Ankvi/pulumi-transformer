import { Command } from "commander";
import log from "loglevel";
import { ActionOptions } from "./actions";

export function setVerbosityLevel(command: Command): void {
    const options = command.optsWithGlobals<ActionOptions>();
    if (options.verbose) {
        log.setLevel("debug");
    }
}
