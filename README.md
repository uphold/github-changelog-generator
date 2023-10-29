# github-changelog-generator

Generate changelog files from the project's GitHub PRs.

## Usage

Generate a new [GitHub Personal Access Token](https://github.com/settings/tokens) and save it to your `.zshrc.local`, `.bashrc.local` or similar:

```sh
export GITHUB_TOKEN=<your_github_personal_access_token>
```

To see a list of available options, run the following command:

```sh
$ github-changelog-generator --help

  Usage: github-changelog-generator [options]

  Run GitHub changelog generator.

  Options:

    -h,   --help                       output usage information
    -b,   --base-branch <name>         [optional] specify the base branch name - master by default
    -f,   --future-release <version>   [optional] specify the next release version
    -t,   --future-release-tag <name>  [optional] specify the next release tag name if it is different from the release version
    -rtp, --release-tag-prefix         [optional] release tag prefix to consider when finding the latest release, useful for monorepos
    -cfp, --changed-files-prefix       [optional] changed files prefix to consider when finding pull-requests, useful for monorepos
    -l,   --labels <names>             [optional] labels to filter pull requests by
    -o,   --owner <name>               [optional] owner of the repository
    -r,   --repo <name>                [optional] name of the repository
    --rebuild                          rebuild the full changelog
```

To generate a changelog for your GitHub project, use the following command:

```sh
$ echo "$(github-changelog-generator --base-branch=<base> --future-release=<release_name> --future-release-tag=<release_tag_name> --owner=<repo_owner> --repo=<repo_name>)\n$(tail -n +2 <your_changelog_file>)" > <your_changelog_file>
```

The `--base-branch` option allows you to filter the PRs by base branch. If omitted, it will default to branch master.

Example:

```sh
$ echo "$(github-changelog-generator --base-branch=production)\n$(tail -n +2 CHANGELOG.md)" > CHANGELOG.md
```

The `--future-release` and `--future-release-tag` options are optional. If your future release tag name is the same as your future release version number, then you can skip `--future-release-tag`.

Example:

```sh
$ echo "$(github-changelog-generator --future-release=1.2.3 --future-release-tag=v1.2.3)\n$(tail -n +2 CHANGELOG.md)" > CHANGELOG.md
```

If you are on a mono-repository, you will need to use `--release-tag-prefix` in order to filter release tags of the package you are targeting. There's also the `--changed-files-prefix` option that may be used to specify the base directory of the package. However, this should be automatic in most cases, except when we are unable to infer the root folder.

Example:

```sh
$ echo "$(github-changelog-generator --future-release=my-package@1.2.3 --future-release-tag=my-package@v1.2.3 --release-tag-prefix=my-package@v)\n$(tail -n +2 CHANGELOG.md)" > CHANGELOG.md
```

The `--owner` and `--repo` options allow you to specify the owner and name of the GitHub repository, respectively. If omitted, they will default to the values found in the project's git config.

Example:

```sh
$ echo "$(github-changelog-generator --owner=uphold --repo=github-changelog-generator)\n$(tail -n +2 CHANGELOG.md)" > CHANGELOG.md
```

The `--labels` option allows you to filter what pull requests are used by their labels. This is useful for repositories with more than one project, by labeling each pull request by what project they belong to, generating a changelog for each project becomes as simple as:

Example:

```sh
$ echo "$(github-changelog-generator --labels projectX,general)\n$(tail -n +2 CHANGELOG.md)" > CHANGELOG.md
```

The `--rebuild` option allows you to fetch the repository's full changelog history.
Starting on major version 2, the default behavior for the generator is to only create the changelog for the pull requests that come after the latest release,
so this option allows for backwards compatibility.

Example:

```sh
$ github-changelog-generator --rebuild > CHANGELOG.md
```

## Release
```sh
yarn release [<newversion> | major | minor | patch]
```
