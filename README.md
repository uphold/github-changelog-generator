# github-changelog-generator
Generate changelog files from the project's Github PRs

## Usage
Generate a new [Github Personal Access Token](https://github.com/settings/tokens) and save it to your `.zshrc.local`, `.bashrc.local` or similar:

```sh
export GITHUB_TOKEN=<your_github_personal_access_token>
```

To see a list of available options, run the following command:

```sh
$ github-changelog-generator --help

  Usage: github-changelog-generator [options]

  Run Github changelog generator.

  Options:

    -h, --help                       output usage information
    -f, --future-release <version>   [optional] specify the next release version
    -t, --future-release-tag <name>  [optional] specify the next release tag name if it is different from the release version
    -o, --owner <name>               [optional] specify owner of the repository. If no value is provided, repository field data in package.json will be used
    -r, --repo <name>                [optional] specify name of the repository. If no value is provided, repository field data in package.json will be used
```

To generate a changelog for your Github project, use the following command:

```sh
$ github-changelog-generator --future-release=<release_name> --future-release-tag=<release_tag_name> --owner=<repo_owner> --repo=<repo_name> > <your_changelog_file>
```

If no `--owner` or `--repo` options are provided, `package.json` will be used to parse the missing information.
 
The `--future-release` and `--future-release-tag` options are optional. If you just want to build a new changelog without a new release, you can skip those options, and `github-changelog-generator` will create a changelog for existing releases only. Also, if your future release tag name is the same as your future release version number, then you can skip `--future-release-tag`.

Example:

```sh
$ github-changelog-generator --owner=uphold --repo=github-changelog-generator --future-release=1.2.3 --future-release-tag=v1.2.3 > CHANGELOG.md
```


## Release
```sh
npm version [<newversion> | major | minor | patch] -m "Release %s"
```
