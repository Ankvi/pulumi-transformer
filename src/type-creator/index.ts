import { cp, mkdir, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline/promises";
import { AZURE_PATH, OUTPUT_PATH, TYPES_FOLDER } from "../constants";

type TypesInfo = {
    hasEnums: boolean;
    lines: string[];
};

type SplitTypesResult = { [key: string]: TypesInfo };

function splitTypeFile(filePath: string): Promise<SplitTypesResult> {
    const inputs = filePath.endsWith("input.ts");

    const subModuleTypeStart = "export namespace ";

    return new Promise((resolve) => {
        const file = createInterface({
            input: createReadStream(filePath),
        });

        let currentModule: string | undefined;

        const moduleTypes: SplitTypesResult = {};

        file.on("line", async (line) => {
            if (line.startsWith(subModuleTypeStart)) {
                currentModule = line.substring(subModuleTypeStart.length, line.indexOf("{") - 1);
            }
            if (currentModule) {
                if (!moduleTypes[currentModule]) {
                    moduleTypes[currentModule] = {
                        hasEnums: false,
                        lines: [
                            'import * as pulumi from "@pulumi/pulumi";',
                        ],
                    };
                }

                if (
                    line.includes(`enums.${currentModule}.`) &&
                    !moduleTypes[currentModule].hasEnums

                ) {
                    moduleTypes[currentModule].lines.unshift('import * as enums from "./enums";');
                    moduleTypes[currentModule].hasEnums = true;
                }

                const formatted = line
                    .replaceAll(`${inputs ? "inputs" : "outputs"}.${currentModule}.`, "")
                    .replaceAll(`enums.${currentModule}.`, "enums.");

                moduleTypes[currentModule].lines.push(formatted);
            }
        });

        file.on("close", () => {
            console.log("File closed. Exiting");
            resolve(moduleTypes);
        });
    });
}

type ModuleTypeFiles = {
    name: string;
    hasEnums: boolean;
    inputs: string[],
    outputs: string[]
}

async function writeModuleTypeFiles(info: ModuleTypeFiles) {
    const typesFolder = `${OUTPUT_PATH}/${info.name}/types`;
    await mkdir(typesFolder, { recursive: true });

    if (info.hasEnums) {
        await cp(`${AZURE_PATH}/types/enums/${info.name}`, `${typesFolder}/enums`, {
            recursive: true,
        });
    }

    const inputFileContent = info.inputs.join("\n");
    const outputFileContent = info.outputs.join("\n");

    await Promise.all([
        writeFile(`${typesFolder}/input.ts`, inputFileContent),
        writeFile(`${typesFolder}/output.ts`, outputFileContent),
    ]);

    await cp(`${__dirname}/type-index-file.template.ts`, `${typesFolder}/index.ts`)

}

export async function createModuleTypeFiles(): Promise<void> {
    const inputsFile = `${AZURE_PATH}/types/input.ts`;
    const outputsFile = `${AZURE_PATH}/types/output.ts`;
    console.log("Reading namespaces from input file");

    const inputs = await splitTypeFile(inputsFile);
    const outputs = await splitTypeFile(outputsFile);

    const stuff = Object.keys(inputs).map<Promise<void>>(key => {
        const input = inputs[key];
        const output = outputs[key];

        return writeModuleTypeFiles({
            name: key,
            hasEnums: input.hasEnums || output.hasEnums,
            inputs: input.lines,
            outputs: output.lines
        });
    });

    await Promise.all(stuff);
}
