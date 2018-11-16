import fs from 'async-file';

type DependencyType = 'dependencies' | 'devDependencies';

export interface DependencyInfo {
  packageName: string;
  version: string;
  project: string;
}

export interface Hash<T> {
    [key: string]: T;
}

export interface PackageJson {
    name: string;
    devDependencies?: Hash<string>;
    dependencies?: Hash<string>;
}

export interface PackageInfo {
    name: string;
    devDependencies: DependencyInfo[];
    dependencies: DependencyInfo[];
    packageJsonFileName?: string;
    packageJsonData?: any;
}

export interface PackageHistogramItem {
    version: string;
    usedByPackage: string;
    type: DependencyType;
}

export interface PackageHistogram {
    [packageName: string]: PackageHistogramItem[];
}

async function readPackageJson(fileName: string): Promise<PackageJson> {
    const fileContents = await fs.readFile(fileName);
    const packageJson = JSON.parse(fileContents);

    return packageJson;
}

export function getRawVersionNumber(packageVersion: string): string {
    return packageVersion.replace('x', '0').replace(/[^0-9\.]/g, '');
}

async function getPackageInfo(pathToPackageJson: string): Promise<PackageInfo | undefined> {
    if (!fs.exists(pathToPackageJson)) {
        return undefined;
    }

    const packageJson = await readPackageJson(pathToPackageJson);

    if (!packageJson) {
        return undefined;
    }

    return {
        name: packageJson.name,
        devDependencies: await getDependencies(packageJson.name, packageJson.devDependencies),
        dependencies: await getDependencies(packageJson.name, packageJson.dependencies),
        packageJsonFileName: pathToPackageJson,
        packageJsonData: packageJson
    }
}

export async function getDependencies(project: string, dependencyMap?: Hash<string>): Promise<DependencyInfo[]> {
    const keys = Object.keys(dependencyMap || {});
    if (keys.length === 0 || !dependencyMap) {
        return [];
    }

    return keys.map((packageName: string): DependencyInfo => {
        return {
            packageName,
            project,
            version: dependencyMap[packageName]
        }
    });
}

function getDependencyList(packageInfo: PackageInfo, dependencyType: DependencyType): DependencyInfo[] {
    switch (dependencyType) {
        case 'dependencies':
            return packageInfo.dependencies;
        case 'devDependencies':
            return packageInfo.devDependencies;
    }

    return [];
}

export function getPackageHistogram(packages: PackageInfo[]): PackageHistogram {
    return (packages || []).reduce((collector: PackageHistogram, current: PackageInfo) => {
        const currentPackageName = current.name;

        const dependencyList = [...current.devDependencies, ...current.dependencies];
        const dependencyTypes: DependencyType[] = ['dependencies', 'devDependencies'];
        
        dependencyTypes.forEach((dependencyType: DependencyType) => {
            const dependencyList = getDependencyList(current, dependencyType);

            dependencyList.forEach((dependency: DependencyInfo) => {
                const currentDependencyName = dependency.packageName;
                if (!collector[currentDependencyName]) {
                    collector[currentDependencyName] = [];
                }
    
                collector[currentDependencyName].push({
                    version: dependency.version,
                    usedByPackage: currentPackageName,
                    type: dependencyType
                });
            });
        });

        return collector;
    }, {} as PackageHistogram);
}

export function getHoistableDependencies(packages: PackageInfo[]): PackageHistogram {
    const histogram = getPackageHistogram(packages);
    const packageNames = Object.keys(histogram || {});
    const result: PackageHistogram = {};

    packageNames.forEach((packageName: string) => {
        if (histogram[packageName].length > 1) {
            result[packageName] = histogram[packageName];
        }
    });

    return result;
}

function isPackageInfo(item: PackageInfo | undefined): item is PackageInfo {
    return item !== undefined;
}

export function resolvePackageVersion(packageVersions: PackageHistogramItem[]): PackageHistogramItem | null {
    const withNormalizedVersions = packageVersions;
    // .map(
    //     (item: PackageHistogramItem): PackageHistogramItem => ({
    //         version: getRawVersionNumber(item.version),
    //         usedByPackage: item.usedByPackage,
    //         type: item.type
    //     }));
    
    if (withNormalizedVersions.length === 0) {
        return null;
    }

    let maximum = withNormalizedVersions[0];
    let dependencyType: DependencyType = maximum.type;

    withNormalizedVersions.slice(1).forEach((item: PackageHistogramItem) => {
        if (getRawVersionNumber(item.version) > getRawVersionNumber(maximum.version)) {
            maximum = item;
        }

        if (item.type === 'dependencies') {
            dependencyType = 'dependencies';
        }
    });

    return { ...maximum, type: dependencyType };
}

function getPackageMap(packages: PackageInfo[]): Hash<PackageInfo> {
    const result: Hash<PackageInfo> = {};
    packages.forEach((pkg: PackageInfo) => result[pkg.name] = pkg);
    return result;
}

export function setDependency(packageJsonData: any, dependencyName: string, version: string, dependencyType: DependencyType = 'devDependencies'): any {
    const data = packageJsonData || { [dependencyType]: {} };
    const depList = { ...(data[dependencyType] || {}) };

    return { ...data, [dependencyType]: { ...depList, [dependencyName]: version }};
}

export function updateDependencyVersion(packageJsonData: any, dependencyName: string, version: string): any {
    let data = packageJsonData || { dependencies: {}, devDependencies: {} };

    if (data.dependencies && data.dependencies[dependencyName]) {
        data = setDependency(packageJsonData, dependencyName, version, 'dependencies');
    }

    if (data.devDependencies && data.devDependencies[dependencyName]) {
        data = setDependency(packageJsonData, dependencyName, version, 'devDependencies');
    }

    return data;
}

export async function hoistDependencies(mainPackageJsonFile: string, packageJsonFiles: string[], dryRun: boolean = true): Promise<void> {
    const packages = await Promise.all(
        packageJsonFiles.map((packageJsonFile: string) => getPackageInfo(packageJsonFile))
    );
    const allPackages: PackageInfo[] = packages.filter(isPackageInfo);
    const hoistableDependencies = getHoistableDependencies(allPackages);
    const packageNames = Object
        .keys(hoistableDependencies)
        .sort((a: string, b: string) => a < b ? -1 : 1);

    const packageMap = getPackageMap(allPackages);

    let mainPackageJson = await readPackageJson(mainPackageJsonFile);

    packageNames.forEach((packageName: string) => {
        const dependency = hoistableDependencies[packageName];
        const packageToUse = resolvePackageVersion(dependency);

        if (!packageToUse) {
            return;
        }

        console.log(`Hoisting package ${packageName} w/ version ${packageToUse.version}`);

        mainPackageJson = setDependency(mainPackageJson, packageName, packageToUse.version);

        dependency.forEach((item: PackageHistogramItem) => {
            const currentPackageName = item.usedByPackage;
            const packageJson = packageMap[currentPackageName].packageJsonData;
            packageMap[currentPackageName].packageJsonData = updateDependencyVersion(
                packageJson,
                packageName,
                packageToUse.version
            );
        });
    });

    packageMap['👾'] = {
        packageJsonData: mainPackageJson,
        packageJsonFileName: mainPackageJsonFile,
        devDependencies: [],
        dependencies: [],
        name: '👾'
    };

    const asyncWritePackage = async (packageName: string): Promise<void> => {
        const fileName = packageMap[packageName].packageJsonFileName;
        const content = packageMap[packageName].packageJsonData;
        const serialized = JSON.stringify(content);

        if (!fileName || !serialized) {
            return;
        }

        if (dryRun) {
            console.log(`Modified: ${fileName}`);
        } else {
            await fs.rename(fileName, `${fileName}.bak`);
            await fs.writeTextFile(fileName, serialized, 'utf8', 'wx');
        }
    }

    const asyncPackageWriter = async (
        packageNames: string[],
        callback: (packageName: string) => void
    ): Promise<void> => {
        for (let idx = 0; idx < packageNames.length; idx++) {
            const packageName = packageNames[idx];
            await callback(packageName)
        }
    }
    
    await asyncPackageWriter(Object.keys(packageMap), asyncWritePackage);
}
