export const AZURE_PATH = `${__dirname}/../azure-native/sdk/nodejs`;
export const MODULE_PREFIX = "@kengachu-pulumi/azure-native-" as const;

export const PULUMI_IMPORT_STATEMENT = 'import * as pulumi from "@pulumi/pulumi";';

export function getOutputPath(): string {
    return process.env.OUTPUT_PATH ?? `${__dirname}/../output`;
}
