import { Command } from "commander";
import * as actions from "./actions";

const program = new Command();

program
    .command("build")
    .action(actions.build);

program
    .command("create-types")
    .action(actions.createTypes);

program.parse();
