import fs from 'fs';
import { getDependencies, getRawVersionNumber, PackageInfo, getPackageHistogram, PackageHistogram, getHoistableDependencies, resolvePackageVersion, Hash, setDependency, PackageHistogramItem, updateDependencyVersion } from '../util';

describe('getRawVersionNumber', () => {
    test('returns normal ', () => {
        expect(getRawVersionNumber('1.2.3')).toBe('1.2.3');
    });

    test('', () => {
        expect(getRawVersionNumber('<=1.2.3')).toBe('1.2.3');
    });

    test('', () => {
        expect(getRawVersionNumber('~1.2.3')).toBe('1.2.3');
    });

    test('', () => {
        expect(getRawVersionNumber('^1.2.3')).toBe('1.2.3');
    });

    test('', () => {
        expect(getRawVersionNumber('1.2.x')).toBe('1.2.0');
    });
});

describe('parse package.json', () => {
    let packageJson: any = null;

    beforeEach(() => {
        const fileContents = fs.readFileSync(`${__dirname}/test-data.json`, "UTF-8");
        packageJson = JSON.parse(fileContents);
    })

    test('get package name', () => {
        const name = packageJson && packageJson.name;
        expect(name).toBe('test-data');
    });

    describe('getPackages', () => {
        test('with missing devDependencies', async () => {
            expect(await getDependencies('test-data', undefined as any as Hash<string>)).toEqual([]);
        });

        test('with empty devDependencies',async  () => {
            expect(await getDependencies('test-data', {} as Hash<string>)).toEqual([]);
        });

        test('with devDependencies', async () => {
            expect(await getDependencies('test-data', packageJson.devDependencies)).toEqual([
                {
                    project: 'test-data',
                    version: '0.1.0',
                    packageName: 'package-A'
                },
                {
                    project: 'test-data',
                    version: '1.0.0',
                    packageName: 'package-B'
                },
                {
                    project: 'test-data',
                    version: '<=2.0.0',
                    packageName: 'package-C'
                }
            ]);
        });

        test('with dependencies', async () => {
            expect(await getDependencies('test-data', packageJson.dependencies)).toEqual([
                {
                    project: 'test-data',
                    version: '0.1.0',
                    packageName: 'dep-A'
                },
                {
                    project: 'test-data',
                    version: '1.0.0',
                    packageName: 'dep-B'
                },
                {
                    project: 'test-data',
                    version: '<=2.0.0',
                    packageName: 'dep-C'
                }
            ]);
        });
    });

    describe('getPackageInfo', () => {
        test('returns empty PackageInfo', () => {

        });

        test('returns valid PackageInfo', async () => {
            const expected: PackageInfo = {
                name: 'test-data',
                devDependencies: [
                    {
                        project: 'test-data',
                        version: '0.1.0',
                        packageName: 'package-A'
                    },
                    {
                        project: 'test-data',
                        version: '1.0.0',
                        packageName: 'package-B'
                    },
                    {
                        project: 'test-data',
                        version: '<=2.0.0',
                        packageName: 'package-C'
                    }
                ],
                dependencies: [
                    {
                        project: 'test-data',
                        version: '0.1.0',
                        packageName: 'dep-A'
                    },
                    {
                        project: 'test-data',
                        version: '1.0.0',
                        packageName: 'dep-B'
                    },
                    {
                        project: 'test-data',
                        version: '<=2.0.0',
                        packageName: 'dep-C'
                    }
                ]
            };
            
        });
    });
});

describe('Test hosting', () => {
    const packageInfoA: PackageInfo = {
        devDependencies: [
            {
                packageName: 'dependency-0',
                project: 'package-A',
                version: '1.0.0'
            },
            {
                packageName: 'dependency-1',
                project: 'package-A',
                version: '2.0.0'
            },
            {
                packageName: 'dependency-3',
                project: 'package-A',
                version: '3.1.0'
            }
        ],
        dependencies: [],
        name: 'package-A'
    };
    const packageInfoB: PackageInfo = {
        devDependencies: [
            {
                packageName: 'dependency-0',
                project: 'package-B',
                version: '1.9.0'
            },
            {
                packageName: 'dependency-2',
                project: 'package-B',
                version: '0.1.0'
            }
        ],
        dependencies: [
            {
                packageName: 'dependency-3',
                project: 'package-B',
                version: '3.1.0'
            },
            {
                packageName: 'dependency-4',
                project: 'package-B',
                version: '0.1.2'
            }
        ],
        name: 'package-B'
    };

    describe('getPackageHistogram', () => {
        test('returns empty histogram when called without data', () => {
            expect(getPackageHistogram(undefined as any)).toEqual({});
        });

        test('returns empty histogram when called with empty array', () => {
            expect(getPackageHistogram([])).toEqual({});
        });

        test('returns valid package histogram', () => {
            const hoisted = getPackageHistogram([ packageInfoA, packageInfoB ]);
            const expected: PackageHistogram = {
                ['dependency-0']: [
                    {
                        version: '1.0.0',
                        usedByPackage: 'package-A',
                        type: 'devDependencies'
                    },
                    {
                        version: '1.9.0',
                        usedByPackage: 'package-B',
                        type: 'devDependencies'
                    }
                ],
                ['dependency-1']: [
                    {
                        version: '2.0.0',
                        usedByPackage: 'package-A',
                        type: 'devDependencies'
                    }
                ],
                ['dependency-2']: [
                    {
                        version: '0.1.0',
                        usedByPackage: 'package-B',
                        type: 'devDependencies'
                    }
                ],
                ['dependency-3']: [
                    {
                        version: '3.1.0',
                        usedByPackage: 'package-A',
                        type: 'devDependencies'
                    },
                    {
                        version: '3.1.0',
                        usedByPackage: 'package-B',
                        type: 'dependencies'
                    },
                ],
                ['dependency-4']: [
                    {
                        version: '0.1.2',
                        usedByPackage: 'package-B',
                        type: 'dependencies'
                    }
                ]
            };

            expect(hoisted).toEqual(expected);
        });
    });

    describe('getHoistableDependencies', () => {
        test('returns empty histogram when called without data', () => {
            expect(getHoistableDependencies(undefined as any)).toEqual({});
        });

        test('returns empty histogram when called with empty array', () => {
            expect(getHoistableDependencies([])).toEqual({});
        });

        test('returns valid package histogram', () => {
            const hoisted = getHoistableDependencies([ packageInfoA, packageInfoB ]);
            const expected: PackageHistogram = {
                ['dependency-0']: [
                    {
                        version: '1.0.0',
                        usedByPackage: 'package-A',
                        type: 'devDependencies'
                    },
                    {
                        version: '1.9.0',
                        usedByPackage: 'package-B',
                        type: 'devDependencies'
                    }
                ],
                ['dependency-3']: [
                    {
                        version: '3.1.0',
                        usedByPackage: 'package-A',
                        type: 'devDependencies'
                    },
                    {
                        version: '3.1.0',
                        usedByPackage: 'package-B',
                        type: 'dependencies'
                    }
                ]
            };

            expect(hoisted).toEqual(expected);
        });
    });

    describe('resolve dependency version', () => {
        describe('get highest version number', () => {
            test('from array of dependencies', () => {
                const testData: PackageHistogramItem[] = [
                    {
                        version: '1.0.0',
                        usedByPackage: 'package-A',
                        type: 'dependencies'
                    },
                    {
                        version: '^2.1.0',
                        usedByPackage: 'package-B',
                        type: 'devDependencies'
                    },
                    {
                        version: '1.9.0',
                        usedByPackage: 'package-B',
                        type: 'dependencies'
                    }
                ];

                const resolvedPackage = resolvePackageVersion(testData);

                expect(resolvedPackage).toBeDefined();
                if (resolvedPackage) {
                    expect(resolvedPackage.version).toBe('^2.1.0');
                }
            });

            test('from slightly similar versions', () => {
                const testData: PackageHistogramItem[] = [
                    {
                        version: '5.9.0',
                        usedByPackage: 'package-A',
                        type: 'dependencies'
                    },
                    {
                        version: '5.11.0',
                        usedByPackage: 'package-B',
                        type: 'devDependencies'
                    }
                ];

                const resolvedPackage = resolvePackageVersion(testData);

                expect(resolvedPackage).toBeDefined();
                if (resolvedPackage) {
                    expect(resolvedPackage.version).toBe('5.11.0');
                }
            });
        });
    });
});

describe('setDevDependency', () => {
    test('set new devDependency', () => {
        const data = { devDependencies: {} };
        const result = setDependency(data, 'test-package', '1.0.0');

        expect(data.devDependencies).toEqual({});
        expect(result).toBeDefined();
        expect(result.devDependencies).toBeDefined();
        expect(result.devDependencies['test-package']).toBe('1.0.0');
    });

    test('set new dependency', () => {
        const data = { dependencies: {} };
        const result = setDependency(data, 'test-package', '1.0.0', 'dependencies');

        expect(data.dependencies).toEqual({});
        expect(result).toBeDefined();
        expect(result.dependencies).toBeDefined();
        expect(result.dependencies['test-package']).toBe('1.0.0');
    });

    test('set new dependency', () => {
        const data = {
            dependencies: {
                'package-A': '0.0.1',
                'package-B': '0.0.2'
            }
        };
        const result = setDependency(data, 'test-package', '1.0.0', 'dependencies');

        expect(result).toBeDefined();
        expect(result.dependencies).toBeDefined();
        expect(result.dependencies['test-package']).toBe('1.0.0');
        expect(Object.keys(result.dependencies).length).toBe(3);
        expect(result.dependencies).toEqual({
            'package-A': '0.0.1',
            'package-B': '0.0.2',
            'test-package': '1.0.0'
        });
    });

    test('set new dependency without devDependency node', () => {
        const data = { name: 'test-package' };
        const result = setDependency(data, 'test-package', '1.0.0');

        expect(result).toBeDefined();
        expect(result.devDependencies).toBeDefined();
        expect(result.devDependencies['test-package']).toBe('1.0.0');
    });

    test('set new dependency without devDependency node', () => {
        const data = { name: 'test-package' };
        const result = setDependency(data, 'test-package', '1.0.0');

        expect(data).toEqual({ name: 'test-package' });
        expect(result).toBeDefined();
        expect(result.devDependencies).toBeDefined();
        expect(result.devDependencies['test-package']).toBe('1.0.0');
    });

    test('set version number to existing dependency', () => {
        const dataA = {
            name: 'test-package-A',
            devDependencies: {
                'test-package': '0.1.0'
            }
        };
        const dataB = {
            name: 'test-package-B',
            dependencies: {
                'test-package': '0.0.1',
                'package-B': '*'
            }
        };
        const resultA = updateDependencyVersion(dataA, 'test-package', '1.0.0');
        const resultB = updateDependencyVersion(dataB, 'test-package', '1.0.0');

        expect(resultA).toBeDefined();
        expect(resultA.dependencies).toBeUndefined();
        expect(resultA.devDependencies).toBeDefined();
        expect(resultA.devDependencies['test-package']).toBeDefined();
        expect(resultA.devDependencies['test-package']).toBe('1.0.0');
        
        expect(resultB).toBeDefined();
        expect(resultB.dependencies).toBeDefined();
        expect(resultB.devDependencies).toBeUndefined();
        expect(resultB.dependencies['test-package']).toBeDefined();
        expect(resultB.dependencies['test-package']).toBe('1.0.0');
        expect(resultB.dependencies['package-B']).toBe('*');
    });
});