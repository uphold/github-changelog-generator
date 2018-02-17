
/**
 * Module dependencies.
 */

const { assign, chain, concat, has, flatten, find, range } = require('lodash');
const gh = require('parse-github-url');
const GitHubApi = require('github');
const Promise = require('bluebird');
const moment = require('moment');
const program = require('commander');

/**
 * Command-line program definition.
 */

program
  .option('-f, --future-release <version>', '[optional] specify the next release version')
  .option('-t, --future-release-tag <name>', '[optional] specify the next release tag name if it is different from the release version')
  .option('-o, --owner <name>', '[optional] specify owner of the repository. If no value is provided, repository field data in package.json will be used')
  .option('-r, --repo <name>', '[optional] specify name of the repository. If no value is provided, repository field data in package.json will be used')
  .description('Run Github changelog generator.')
  .parse(process.argv);

/**
 * Options.
 */

const concurrency = 20;
const futureRelease = program.futureRelease;
const futureReleaseTag = program.futureReleaseTag || futureRelease;
let { owner, repo } = program;
const token = process.env.GITHUB_TOKEN;

if (!owner || !repo) {
  /**
   * Try to read missing values from package.json.
   */

  let pjson;

  try {
    pjson = require(`${process.cwd()}/package.json`);
  } catch (e) {
    process.stderr.write(`  Missing owner/repo values. Add package.json file with a valid repository value or provide --owner and --repo options.`);

    process.exit(1);
  }

  if (pjson && pjson.repository) {
    const repoUrl = pjson.repository.url || pjson.repository;

    if (repoUrl) {
      const packageRepositoryData = gh(repoUrl);

      if (packageRepositoryData) {
        owner = owner || packageRepositoryData.owner;
        repo = repo || packageRepositoryData.name;
      }
    }
  }
}

if (!owner || !repo) {
  process.stderr.write(`  Missing owner/repo values. Check if package.json contains a valid repository value or provide --owner and --repo options.`);

  process.exit(1);
}

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
