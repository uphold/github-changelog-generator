
/**
 * Module dependencies.
 */

const { assign, chain, concat, flatten, find, range } = require('lodash');
const GitHubApi = require('github');
const Promise = require('bluebird');
const moment = require('moment');

/**
 * Options.
 */

const concurrency = 20;
const futureRelease = process.env.FUTURE_RELEASE;
const token = process.env.GITHUB_TOKEN;
const owner = process.env.OWNER;
const repo = process.env.REPO;

/**
 * Set up Github API connection.
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
  const lastPage = results.meta.link.match(/<[^>]+[&?]page=([0-9]+)[^>]+>; rel="last"/)[1];
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
      html_url: `https://github.com/uphold/backend/releases/tag/${futureRelease}`,
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
  return await github.pullRequests.getAll({ owner, page, per_page: 100, repo, state: 'closed' });
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
    changelog.push(`\n## [${release.name}](${release.html_url}) (${release.created_at.format('YYYY-MM-DD')})\n`);

    for (const pr of release.prs) {
      changelog.push(`- ${pr.title} [${pr.number}](${pr.html_url}) ([${pr.user.login}](${pr.user.html_url}))\n`);
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
