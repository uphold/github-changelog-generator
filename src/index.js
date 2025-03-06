'use strict';

/**
 * Module dependencies.
 */

const { Command } = require('commander');
const { formatChangelog } = require('./changelog-formatter');
const { lookItUpSync } = require('look-it-up');
const { readFileSync } = require('fs');
const ChangelogFetcher = require('./changelog-fetcher');
const ini = require('ini');
const path = require('path');

/**
 * Instances.
 */

const program = new Command();

/**
 * Command-line program definition.
 */

program
  .option('-b, --base-branch <name>', '[optional] specify the base branch name - master by default')
  .option('-f, --future-release <version>', '[optional] specify the next release version')
  .option(
    '-t, --future-release-tag <name>',
    '[optional] specify the next release tag name if it is different from the release version'
  )
  .option(
    '-rtp, --release-tag-prefix <prefix>',
    '[optional] release tag prefix to consider when finding the latest release, useful for monorepos'
  )
  .option(
    '-cfp, --changed-files-prefix <prefix>',
    '[optional] changed files prefix to consider when finding pull-requests, useful for monorepos'
  )
  .option('-l, --labels <names>', '[optional] labels to filter pull requests by', val => val.split(','))
  .option('-o, --owner <name>', '[optional] owner of the repository')
  .option('-r, --repo <name>', '[optional] name of the repository')
  .option('--rebuild', 'rebuild the full changelog', false)
  .description('Run GitHub changelog generator.')
  .parse(process.argv);

/**
 * Options.
 */

const options = program.opts();
const gitDir = lookItUpSync('.git');
const { baseBranch = 'master', futureRelease, futureReleaseTag, labels, rebuild, releaseTagPrefix } = options;
const token = process.env.GITHUB_TOKEN;
let { changedFilesPrefix, owner, repo } = options;

/**
 * Infer owner and repo from git config if not provided.
 */

if (!owner || !repo) {
  try {
    const gitconfig = readFileSync(path.join(gitDir, 'config'), 'utf-8');
    const remoteOrigin = ini.parse(gitconfig)['remote "origin"'];
    const match = remoteOrigin.url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);

    owner = owner || match[1];
    repo = repo || match[2];
  } catch (e) {
    process.stderr.write(`
      Failed to infer repository owner and name.
      Please use options --owner and --repo to manually set them.
    `);

    process.exit(1);
  }
}

/**
 * Infer changed files prefix from git directory.
 */

if (!changedFilesPrefix) {
  changedFilesPrefix = path.relative(path.resolve(gitDir, '..'), '.').split(path.sep).join(path.posix.sep);
}

/**
 * Run the changelog generator.
 */

async function run() {
  const fetcher = new ChangelogFetcher({
    base: baseBranch,
    changedFilesPrefix,
    futureRelease,
    futureReleaseTag,
    labels,
    owner,
    releaseTagPrefix,
    repo,
    token
  });

  const releases = await (rebuild ? fetcher.fetchFullChangelog() : fetcher.fetchLatestChangelog());

  formatChangelog(releases).forEach(line => process.stdout.write(line));
}

/**
 * Run.
 */

run();
