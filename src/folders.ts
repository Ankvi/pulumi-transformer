import { Dirent } from "fs";
import { readdir } from "fs/promises";

export async function getFolders(path: PathLike): Promise<Dirent[]> {
    try {
        const dirents = await readdir(path, {
            withFileTypes: true,
        });
        return dirents.filter((dirent) => dirent.isDirectory());
    } catch (error) {
        return [];
    }
}

export async function getFolderNames(path: PathLike): Promise<string[]> {
    const dirents = await getFolders(path);
    return dirents.map((dirent) => dirent.name);
}
