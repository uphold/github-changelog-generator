
/**
 * Module dependencies.
 */

const { readFileSync } = require('fs');
const { formatChangelog } = require('./changelog-formatter');
const ChangelogFetcher = require('./changelog-fetcher');
const ini = require('ini');
const path = require('path');
const program = require('commander');

/**
 * Command-line program definition.
 */

program
  .option('-b, --base-branch <name>', '[optional] specify the base branch name - master by default')
  .option('-f, --future-release <version>', '[optional] specify the next release version')
  .option('-t, --future-release-tag <name>', '[optional] specify the next release tag name if it is different from the release version')
  .option('-l, --labels <names>', '[optional] labels to filter pull requests by', val => val.split(','))
  .option('-o, --owner <name>', '[optional] owner of the repository')
  .option('-r, --repo <name>', '[optional] name of the repository')
  .description('Run GitHub changelog generator.')
  .parse(process.argv);

/**
 * Options.
 */

const base = program.baseBranch || 'master';
const { futureRelease, futureReleaseTag, labels } = program;
const token = process.env.GITHUB_TOKEN;
let { owner, repo } = program;

/**
 * Infer owner and repo from git config if not provided.
 */

if (!owner || !repo) {
  const dir = path.resolve('.');

  try {
    const gitconfig = readFileSync(path.join(dir, '.git/config'), 'utf-8');
    const remoteOrigin = ini.parse(gitconfig)['remote "origin"'];
    const match = remoteOrigin.url.match(/.+:([^/]+)\/(.+)\.git/);

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
 * Run the changelog generator.
 */

async function run() {
  const fetcher = new ChangelogFetcher({ base, futureRelease, futureReleaseTag, labels, owner, repo, token });
  const releases = await fetcher.fetchChangelog();

  formatChangelog(releases).forEach(line => process.stdout.write(line));
}

/**
 * Run.
 */

run();
