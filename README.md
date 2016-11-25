# github-changelog-generator
Generate changelog files from the project's Github PRs

## Usage
Generate a new [Github Personal Access Token](https://github.com/settings/tokens) and save it it your `.zshrc.local`, `.bashrc.local` or similar:

```sh
export GITHUB_TOKEN=<your_github_personal_access_token>
```

To generate a changelog for your Github project, use the following command:

```sh
$ OWNER=<repo_owner> REPO=<repo_name> FUTURE_RELEASE=<release_name> github-changelog-generator > <your_changelog_file>
```

Example:

```sh
$ OWNER=uphold REPO=github-changelog-generator FUTURE_RELEASE=1.2.3 github-changelog-generator > CHANGELOG.md
```

The `FUTURE_RELEASE` option is optional. If you just want to build a new changelog without a new release, you can skip that option, and `github-changelog-generator` will create a changelog for existing releases only.

## Release
```sh
npm version [<newversion> | major | minor | patch] -m "Release %s"
```
