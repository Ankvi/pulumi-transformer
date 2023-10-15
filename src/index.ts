import { Command } from "commander";
import log from "loglevel";
import * as actions from "./actions";
import * as hooks from "./hooks";

log.setLevel("info");

const program = new Command();

program.option("-v, --verbose", "Display debug log statements");

program
    .command("build")
    .option("-o, --output-path <path>", "Output path")
    .option(
        "-a, --azure-native-version <version>",
        "Version of @pulumi/azure-native to use. E.g. v2.8.0",
    )
    .option("--output-version <output-version>", "Override output package version. E.g. 2.8.1")
    .option("--no-cache", "Do not use cache for azure native version")
    .action(actions.build);

program.command("list-module-names").action(actions.listModuleNames);

program.hook("preAction", hooks.setVerbosityLevel);

program.parse();
