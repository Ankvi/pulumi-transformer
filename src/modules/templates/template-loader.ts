import { readFileSync } from "node:fs";
import { writeFile, cp } from "node:fs/promises";
import { PackageJson } from "./types";
import { AZURE_PATH, MODULE_PREFIX } from "../../constants";

type WriteOptions = {
    subModule: IModule;
    withCoreDeps?: boolean;
};

export interface IModule {
    name: string;
    outputPath: string;
}

class TemplateLoader {
    private template: string;
    private version: string;

    constructor() {
        this.template = readFileSync(`${__dirname}/package.template.json`, "utf-8");

        this.version = "2.6.0";

        console.log(`Created template loader for version: ${this.version}`);
    }

    private getTemplate(name: string, withCoreDeps = false): PackageJson {
        const template = JSON.parse(
            this.template
                .replaceAll("${PACKAGE_NAME}", `${MODULE_PREFIX}${name}`)
                .replaceAll("${NAME}", name)
                .replaceAll("${VERSION}", this.version),
        ) as PackageJson;
        if (withCoreDeps) {
            template.dependencies[`${MODULE_PREFIX}core`] = this.version;
        }
        return template;
    }

    public async writeTemplateToFolder({ subModule, withCoreDeps }: WriteOptions): Promise<void> {
        const folder = subModule.outputPath;

        const template = this.getTemplate(subModule.name, withCoreDeps);
        await writeFile(`${folder}/package.json`, JSON.stringify(template, null, 4), "utf-8");

        const scriptFolder = `${AZURE_PATH}/scripts`;
        await cp(scriptFolder, `${folder}/scripts`, { recursive: true });
        await cp(`${__dirname}/README.template.md`, `${folder}/README.md`);
        await cp(`${__dirname}/tsconfig.template.json`, `${folder}/tsconfig.json`);
    }
}

export const templateLoader = new TemplateLoader();
