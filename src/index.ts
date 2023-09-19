import { Command } from "commander";
import * as actions from "./actions";

const program = new Command();

program.command("build").option("-o, --output", "Output path").action(actions.build);

program.command("list-module-names").action(actions.listModuleNames);

program.parse();
