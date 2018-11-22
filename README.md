# Hoist-Dev-Packages

Parse all `package.json` files of each package of the monorepo and will collect the used dependencies. If a dependency is used in more than one monorepo-package, then it's hoisted and set as `devDependency` in the main `package.json` with the highest version used. All other matches for this dependency will be set to this highest version.

## Usage

```sh
npx hoist-dev-packages /path/to/monorepo/
```

or, while development:

```sh
npm start /path/to/monorepo/
```