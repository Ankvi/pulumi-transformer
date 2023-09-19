import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import { Dirent, createReadStream } from "node:fs";
import { createInterface } from "node:readline/promises";
import { AZURE_PATH, getOutputPath } from "./constants";

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
                if (!moduleTypes[currentModule]) {
                    moduleTypes[currentModule] = {
                        hasEnums: false,
                        lines: ['import * as pulumi from "@pulumi/pulumi";'],
                    };
                }

                return;
            }

            if (line === "}") {
                currentModule = undefined;
                return;
            }

            if (currentModule) {
                const formatted = line
                    .replace("    ", "") // Remove first tab to compensate for missing namespace
                    .replaceAll(`${inputs ? "inputs" : "outputs"}.${currentModule}.`, "")
                    .replaceAll(`enums.${currentModule}.`, "enums.");

                moduleTypes[currentModule].lines.push(formatted);
            }
        });

        file.on("close", () => {
            resolve(moduleTypes);
        });
    });
}

type ModuleTypeFiles = {
    name: string;
    hasEnums: boolean;
    inputs?: string[];
    outputs?: string[];
};

async function writeModuleTypeFiles(info: ModuleTypeFiles) {
    const typesFolder = `${getOutputPath()}/${info.name}/types`;
    await mkdir(typesFolder, { recursive: true });

    const indexContent = [];

    try {
        await cp(`${AZURE_PATH}/types/enums/${info.name}`, `${typesFolder}/enums`, {
            recursive: true,
        });
        indexContent.push('export * as enums from "./enums";');
        info.outputs?.unshift('import * as enums from "./enums";');
        info.inputs?.unshift('import * as enums from "./enums";');
    } catch (error) {
        console.log(`${info.name} has no enums`);
    }

    if (info.inputs) {
        const inputFileContent = info.inputs.join("\n");
        indexContent.push('export * as inputs from "./input";');
        writeFile(`${typesFolder}/input.ts`, inputFileContent);
    }

    if (info.outputs) {
        const outputFileContent = info.outputs.join("\n");
        indexContent.push('export * as outputs from "./output";');
        writeFile(`${typesFolder}/output.ts`, outputFileContent);
    }

    await writeFile(`${typesFolder}/index.ts`, indexContent.join("\n"));
}

export async function createModuleTypeFiles(): Promise<void> {
    const inputsFile = `${AZURE_PATH}/types/input.ts`;
    const outputsFile = `${AZURE_PATH}/types/output.ts`;

    console.log("Splitting original input/output type files");

    const inputs = await splitTypeFile(inputsFile);
    const outputs = await splitTypeFile(outputsFile);

    const enumFolders = await readdir(`${AZURE_PATH}/types/enums`, {
        withFileTypes: true,
    });

    const enumFolderMap = enumFolders.reduce<Map<string, Dirent>>((folders, dirent) => {
        if (dirent.isDirectory()) {
            folders[dirent.name] = dirent;
        }
        return folders;
    }, new Map());

    const keySet = new Set([
        ...Object.keys(inputs),
        ...Object.keys(outputs),
        ...Object.keys(enumFolderMap),
    ]);
    const keys = Array.from(keySet);

    const writeTasks = keys.map<Promise<void>>((key) => {
        const input = inputs[key];
        const output = outputs[key];

        return writeModuleTypeFiles({
            name: key,
            hasEnums: enumFolderMap.has(key),
            inputs: input?.lines,
            outputs: output?.lines,
        });
    });

    await Promise.all(writeTasks);

    console.log("Successfully split original input/output type files");
}
