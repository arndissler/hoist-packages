# hoist-packages

Parse all `package.json` files of each package of a monorepo and will collect the used dependencies. If a dependency is used in more than one monorepo-package, then it's hoisted in the main `package.json` with the highest version used. All other matches for this dependency will be set to this highest version.

*Warning*: this tool will NOT check for pinned versions or resolve the most accurate version. All versions are simplified, e.g. "^1.2.3" will be simplified to "1.2.3", etc.

## Usage

```sh
npx hoist-packages /path/to/monorepo/
```

or, while development:

```sh
npm start /path/to/monorepo/
```