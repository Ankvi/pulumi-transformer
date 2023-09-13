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

program.parse();
