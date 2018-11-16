import * as sh from 'shelljs';
import { hoistDependencies } from './util';

export async function main(): Promise<undefined> {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.log(`Usage: npm start <folder>`);
        process.exit(127);
        return;
    }

    const targetFolder = args[0];
    sh.cd(targetFolder);
    sh.config.silent = true;
    
    const fls = sh.exec(`find . -name 'package.json' | grep -v '/node_modules/'`);
    if (fls.code !== 0) {
        console.log(`Error: cannot list all package.json files in '${targetFolder}'`);
        console.log(`Maybe no package.json or the folder is not valid.\n`);
        process.exit(125);
        return;
    }

    const files: string[] = fls.stdout.split('\n')
        .filter((item: string) => item)
        .map((item: string) => item.replace(/^\./, targetFolder));

    files.sort((a: string, b: string) => a.length < b.length ? 1 : -1);
    const mainPackageJson = files.pop();

    if (!mainPackageJson) {
        process.exit(123);
        return;
    }

    await hoistDependencies(mainPackageJson, files, false);

    process.exit(0);
}

main();
