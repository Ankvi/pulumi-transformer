import { Command } from "commander";
import * as actions from "./actions";

const program = new Command();

program
    .command("build")
    .option("-o, --output-path <path>", "Output path")
    .option(
        "-a, --azure-native-version <version>",
        "Version of @pulumi/azure-native to use. E.g. v2.8.0",
    )
    .option("-v, --output-version <version>", "Override output package version. E.g. 2.8.1")
    .action(actions.build);

program.command("list-module-names").action(actions.listModuleNames);

program.parse();
