
/**
 * Module dependencies.
 */

const { assign, chain, concat, has, flatten, find, range } = require('lodash');
const GitHubApi = require('github');
const Promise = require('bluebird');
const moment = require('moment');
const program = require('commander');

/**
 * Command-line program definition.
 */

program
  .option('-o, --owner <name>', '[required] owner of the repository')
  .option('-r, --repo <name>', '[required] name of the repository')
  .option('-b, --base-branch <name>', '[optional] specify the base branch name - master by default')
  .option('-f, --future-release <version>', '[optional] specify the next release version')
  .option('-t, --future-release-tag <name>', '[optional] specify the next release tag name if it is different from the release version')
  .description('Run GitHub changelog generator.')
  .parse(process.argv);

/**
 * Options.
 */

const base = program.baseBranch || 'master';
const concurrency = 20;
const { futureRelease, owner, repo } = program;
const futureReleaseTag = program.futureReleaseTag || futureRelease;
const token = process.env.GITHUB_TOKEN;

if (!owner || !repo) {
  process.stderr.write(`  Missing required options.\n${program.helpInformation()}`);

  process.exit(1);
}

/**
 * Set up GitHub API connection.
 */

const github = new GitHubApi({ Promise });

github.authenticate({ token, type: 'token' });

/**
 * Assign a PR to a release.
 */

function assignPrToRelease(releases, pr) {
  const release = find(releases, release => pr.merged_at.isSameOrBefore(release.created_at));

  if (release) {
    release.prs.unshift(pr);
  }
}

/**
 * Get results from the next pages.
 */

async function getResultsFromNextPages(results, fn) {
  let lastPage = 1;

  if (has(results, 'meta.link')) {
    lastPage = results.meta.link.match(/<[^>]+[&?]page=([0-9]+)[^>]+>; rel="last"/)[1];
  }

  const pages = range(2, lastPage + 1);

  return concat(results, flatten(await Promise.map(pages, fn, { concurrency })));
}

/**
 * Get a page of releases.
 */

async function getReleasesPage(page = 1) {
  return await github.repos.getReleases({ owner, page, per_page: 100, repo });
}

/**
 * Get all releases.
 */

async function getAllReleases() {
  const releases = await getReleasesPage();

  if (futureRelease) {
    releases.unshift({
      created_at: moment().format(),
      html_url: `https://github.com/${owner}/${repo}/releases/tag/${futureReleaseTag}`,
      name: futureRelease
    });
  }

  return chain(await getResultsFromNextPages(releases, getReleasesPage))
    .map(release => assign(release, { created_at: moment.utc(release.created_at), prs: [] }))
    .sortBy(release => release.created_at.unix())
    .value();
}

/**
 * Get a page of PRs.
 */

async function getPullRequestsPage(page = 1) {
  return await github.pullRequests.getAll({ base, owner, page, per_page: 100, repo, state: 'closed' });
}

/**
 * Get all PRs.
 */

async function getAllPullRequests() {
  const prs = await getPullRequestsPage();

  return chain(await getResultsFromNextPages(prs, getPullRequestsPage))
    .map(pr => assign(pr, { merged_at: moment.utc(pr.merged_at) }))
    .sortBy(pr => pr.merged_at.unix())
    .value();
}

/**
 * Generate and write the  formatted changelog.
 */

function writeChangelog(releases) {
  const changelog = ['# Changelog\n'];

  for (const release of releases) {
    changelog.push(`\n## [${release.name || release.tag_name}](${release.html_url}) (${release.created_at.format('YYYY-MM-DD')})\n`);

    for (const pr of release.prs) {
      changelog.push(`- ${pr.title} [\\#${pr.number}](${pr.html_url}) ([${pr.user.login}](${pr.user.html_url}))\n`);
    }
  }

  changelog.forEach(line => process.stdout.write(line));
}

/**
 * Run the changelog generator.
 */

async function run() {
  const [releases, prs] = await Promise.all([getAllReleases(), getAllPullRequests()]);

  prs.forEach(pr => assignPrToRelease(releases, pr));

  writeChangelog(releases.reverse());
}

/**
 * Run.
 */

run();
