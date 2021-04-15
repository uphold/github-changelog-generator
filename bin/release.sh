#!/usr/bin/env sh

release() {
  
  # Bump version using `yarn`.
  yarn version --no-git-tag-version --new-version ${1:-patch}

  # Get the new version number.
  local version=`grep -m1 version package.json | awk -F: '{ print $2 }' | sed 's/[", ]//g'`

  # Create deploy branch.
  git checkout -b deploy/${version}

  # Generate changelog.
  echo "$(bin/github-changelog-generator.js -f ${version} -t v${version})\n$(tail -n +2 CHANGELOG.md)" > CHANGELOG.md

  # Add modified files.
  git add .

  # Commit release with new version.
  git commit -m "Release ${version}"

  # Tag commit with the new version.
  git tag v$version
}

release $1
