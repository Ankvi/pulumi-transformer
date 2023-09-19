import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import { Dirent, createReadStream } from "node:fs";
import { createInterface } from "node:readline/promises";
import { AZURE_PATH, PULUMI_IMPORT_STATEMENT, getOutputPath } from "./constants";

type SubModuleTypeInfo = {
    lines: string[];
};

type TypesInfo = SubModuleTypeInfo & {
    subVersions: Map<string, SubModuleTypeInfo>;
};

type SplitTypesResult = Map<string, TypesInfo>;

function splitTypeFile(filePath: string): Promise<SplitTypesResult> {
    const inputs = filePath.endsWith("input.ts");

    const moduleTypeStart = "export namespace ";
    const moduleTypeEnd = "}";

    const subModuleTypeStart = "    export namespace v";
    const subModuleTypeEnd = "    }";

    return new Promise((resolve) => {
        const file = createInterface({
            input: createReadStream(filePath),
        });

        let currentModuleName = "";
        let currentModule: TypesInfo | undefined;
        let currentSubModuleName = "";
        let currentSubModule: SubModuleTypeInfo | undefined;

        const moduleTypes: SplitTypesResult = new Map<string, TypesInfo>();

        file.on("line", async (line) => {
            if (line.startsWith(moduleTypeStart)) {
                currentModuleName = line.substring(moduleTypeStart.length, line.indexOf("{") - 1);
                if (!moduleTypes.has(currentModuleName)) {
                    currentModule = {
                        lines: [PULUMI_IMPORT_STATEMENT],
                        subVersions: new Map(),
                    };
                    moduleTypes.set(currentModuleName, currentModule);
                }

                return;
            }

            if (line === moduleTypeEnd) {
                currentModule = undefined;
                currentSubModule = undefined;
                return;
            }

            if (line === subModuleTypeEnd) {
                currentSubModule = undefined;
                return;
            }

            if (currentModule) {
                if (line.startsWith(subModuleTypeStart)) {
                    currentSubModuleName = line.substring(
                        subModuleTypeStart.length,
                        line.indexOf("{") - 1,
                    );
                    if (!currentModule.subVersions.has(currentSubModuleName)) {
                        currentSubModule = {
                            lines: [PULUMI_IMPORT_STATEMENT],
                        };
                        currentModule.subVersions.set(currentSubModuleName, currentSubModule);
                    }

                    return;
                }

                if (currentSubModule) {
                    const formatted = line
                        .replace("    ", "") // Remove first tab to compensate for missing namespace
                        .replaceAll(
                            `${inputs ? "inputs" : "outputs"
                            }.${currentModuleName}.${currentSubModuleName}.`,
                            "",
                        )
                        .replaceAll(
                            `enums.${currentModuleName}.${currentSubModuleName}.`,
                            "enums.",
                        );

                    currentSubModule.lines.push(formatted);

                    return;
                }

                const formatted = line
                    .replace("    ", "") // Remove first tab to compensate for missing namespace
                    .replaceAll(`${inputs ? "inputs" : "outputs"}.${currentModuleName}.`, "")
                    .replaceAll(`enums.${currentModuleName}.`, "enums.");

                currentModule.lines.push(formatted);
            }
        });

        file.on("close", () => {
            resolve(moduleTypes);
        });
    });
}

type ModuleTypeFiles = {
    name: string;
    inputs?: string[];
    outputs?: string[];
};

async function writeModuleTypeFiles(info: ModuleTypeFiles) {
    const typesFolder = `${getOutputPath()}/${info.name}/types`;
    await mkdir(typesFolder, { recursive: true });

    const indexContent = [];

    try {
        await cp(`${AZURE_PATH}/types/enums/${info.name}/index.ts`, `${typesFolder}/enums.ts`);
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

async function writeSubModuleTypeFiles(parentName: string, info: ModuleTypeFiles) {
    const typesFolder = `${getOutputPath()}/${parentName}/${info.name}/types`;
    await mkdir(typesFolder, { recursive: true });

    const indexContent = [];

    try {
        const sourceFile = Bun.file(
            `${AZURE_PATH}/types/enums/${parentName}/${info.name}/index.ts`,
        );
        const content = await sourceFile.text();
        const formatted = content.substring(content.indexOf("export const "));
        await Bun.write(`${typesFolder}/enums.ts`, formatted);

        indexContent.push('export * as enums from "./enums";');
        info.outputs?.unshift('import * as enums from "./enums";');
        info.inputs?.unshift('import * as enums from "./enums";');
    } catch (error) {
        console.log(`${parentName}/${info.name} has no enums`);
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

    const enumFolderMap = enumFolders.reduce<Map<string, Dirent>>(
        (folders, dirent) => (dirent.isDirectory() ? folders.set(dirent.name, dirent) : folders),
        new Map(),
    );

    const keySet = new Set([
        ...Object.keys(inputs),
        ...Object.keys(outputs),
        ...Object.keys(enumFolderMap),
    ]);
    const keys = Array.from(keySet);

    const writeTasks = keys.map<Promise<void>>(async (key) => {
        const input = inputs.get(key);
        const output = outputs.get(key);

        const subVersions = new Set<string>(
            ...Object.keys(input?.subVersions ?? {}),
            ...Object.keys(output?.subVersions ?? {}),
        );

        const tasks: Promise<void>[] = [
            writeModuleTypeFiles({
                name: key,
                inputs: input?.lines,
                outputs: output?.lines,
            }),
        ];
        for (const subVersion of subVersions.values()) {
            tasks.push(
                writeSubModuleTypeFiles(key, {
                    name: subVersion,
                    inputs: input?.subVersions?.get(subVersion)?.lines,
                    outputs: output?.subVersions?.get(subVersion)?.lines,
                }),
            );
        }

        await Promise.all(tasks);
    });

    await Promise.all(writeTasks);

    console.log("Successfully split original input/output type files");
}
