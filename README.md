# github-changelog-generator
Generate changelog files from the project's Github PRs

## Usage
Generate a new [Github Personal Access Token](https://github.com/settings/tokens) and save it it your `.zshrc.local`, `.bashrc.local` or similar:

```sh
export GITHUB_TOKEN=<your_github_personal_access_token>
```

To see a list of available options, run the following command:

```sh
$ github-changelog-generator --help

  Usage: github-changelog-generator [options]

  Run Github changelog generator.

  Options:

    -h, --help                      output usage information
    -o, --owner <name>              [required] owner of the repository
    -r, --repo <name>               [required] name of the repository
    -f, --future-release <version>  [optional] specify the next release tag
```

To generate a changelog for your Github project, use the following command:

```sh
$ github-changelog-generator --owner=<repo_owner> --repo=<repo_name> --future-release=<release_name>  > <your_changelog_file>
```

The `--future-release` option is optional. If you just want to build a new changelog without a new release, you can skip that option, and `github-changelog-generator` will create a changelog for existing releases only.

Example:

```sh
$ github-changelog-generator --owner=uphold --repo=github-changelog-generator --future-release=1.2.3 > CHANGELOG.md
```


## Release
```sh
npm version [<newversion> | major | minor | patch] -m "Release %s"
```
