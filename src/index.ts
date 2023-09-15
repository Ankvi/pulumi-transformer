import { Command } from "commander";
import * as actions from "./actions";

const program = new Command();

program
    .command("build")
    .action(actions.build);

program
    .command("create-types")
    .action(actions.createTypes);

program
    .command("publish")
    .option("-d, --dry-run", "Dry run")
    .option("-l, --log-errors", "Log errors")
    .action((options) => {
        actions.publish(options);
    });

program
    .command("unpublish")
    .argument("<version>", "Version to unpublish")
    .option("-l, --log-errors", "Log errors")
    .action(actions.unpublish);

program
    .command("list-module-names")
    .action(actions.listModuleNames);

program.parse();
