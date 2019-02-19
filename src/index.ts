#!/usr/bin/env node

import * as sh from 'shelljs';
import { hoistDependencies } from './util';
import { fileURLToPath } from 'url';

export default async function main(): Promise<undefined> {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.log(`Usage: npm start <folder>`);
        process.exit(127);
        return;
    }

    const targetFolder = args[0];
    await hoist(targetFolder);
    process.exit(0);
}

export async function hoist(targetFolder: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        sh.cd(targetFolder);
        sh.config.silent = true;
        
        const fls = sh.exec(`find . -name 'package.json' | grep -v '/node_modules/'`);
        if (fls.code !== 0) {
            console.log(`Error: cannot list all package.json files in '${targetFolder}'`);
            console.log(`Maybe no package.json or the folder is not valid.\n`);
            process.exit(125);
            resolve(true);
        }

        const files: string[] = fls.stdout.split('\n')
            .filter((item: string) => item)
            .map((item: string) => item.replace(/^\./, targetFolder));

        files.sort((a: string, b: string) => a.length < b.length ? 1 : -1);
        const mainPackageJson = files.pop();

        if (!mainPackageJson) {
            reject(false);
            return;
        }

        await hoistDependencies(mainPackageJson, files, false);
        resolve(true);
    });
}

if (process && process.argv && process.argv.length === 3 && process.argv0 === 'node') {
    const targetFolder = process.argv[2];
    if (sh.test('-d', targetFolder)) {
        console.log(`Starting hoisting packages in '${targetFolder}'`);
        hoist(targetFolder).then(() => console.log('done.\n'));
    } else {
        console.log(`Error: cannot open folder '${targetFolder}'`);
        console.log('');
    }
} else {
    console.log(`Usage: npm start /path/to/monorepo/`);
    console.log('');
}
