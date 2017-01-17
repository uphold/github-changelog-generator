'use strict';

var _bluebird = require('bluebird');

/**
 * Get results from the next pages.
 */

let getResultsFromNextPages = (() => {
  var _ref = (0, _bluebird.coroutine)(function* (results, fn) {
    let lastPage = 1;

    if (has(results, 'meta.link')) {
      lastPage = results.meta.link.match(/<[^>]+[&?]page=([0-9]+)[^>]+>; rel="last"/)[1];
    }

    const pages = range(2, lastPage + 1);

    return concat(results, flatten((yield Promise.map(pages, fn, { concurrency }))));
  });

  return function getResultsFromNextPages(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

/**
 * Get a page of releases.
 */

let getReleasesPage = (() => {
  var _ref2 = (0, _bluebird.coroutine)(function* (page = 1) {
    return yield github.repos.getReleases({ owner, page, per_page: 100, repo });
  });

  return function getReleasesPage() {
    return _ref2.apply(this, arguments);
  };
})();

/**
 * Get all releases.
 */

let getAllReleases = (() => {
  var _ref3 = (0, _bluebird.coroutine)(function* () {
    const releases = yield getReleasesPage();

    if (futureRelease) {
      releases.unshift({
        created_at: moment().format(),
        html_url: `https://github.com/${ owner }/${ repo }/releases/tag/${ futureReleaseTag }`,
        name: futureRelease
      });
    }

    return chain((yield getResultsFromNextPages(releases, getReleasesPage))).map(function (release) {
      return assign(release, { created_at: moment.utc(release.created_at), prs: [] });
    }).sortBy(function (release) {
      return release.created_at.unix();
    }).value();
  });

  return function getAllReleases() {
    return _ref3.apply(this, arguments);
  };
})();

/**
 * Get a page of PRs.
 */

let getPullRequestsPage = (() => {
  var _ref4 = (0, _bluebird.coroutine)(function* (page = 1) {
    return yield github.pullRequests.getAll({ owner, page, per_page: 100, repo, state: 'closed' });
  });

  return function getPullRequestsPage() {
    return _ref4.apply(this, arguments);
  };
})();

/**
 * Get all PRs.
 */

let getAllPullRequests = (() => {
  var _ref5 = (0, _bluebird.coroutine)(function* () {
    const prs = yield getPullRequestsPage();

    return chain((yield getResultsFromNextPages(prs, getPullRequestsPage))).map(function (pr) {
      return assign(pr, { merged_at: moment.utc(pr.merged_at) });
    }).sortBy(function (pr) {
      return pr.merged_at.unix();
    }).value();
  });

  return function getAllPullRequests() {
    return _ref5.apply(this, arguments);
  };
})();

/**
 * Generate and write the  formatted changelog.
 */

/**
 * Run the changelog generator.
 */

let run = (() => {
  var _ref6 = (0, _bluebird.coroutine)(function* () {
    const [releases, prs] = yield Promise.all([getAllReleases(), getAllPullRequests()]);

    prs.forEach(function (pr) {
      return assignPrToRelease(releases, pr);
    });

    writeChangelog(releases.reverse());
  });

  return function run() {
    return _ref6.apply(this, arguments);
  };
})();

/**
 * Run.
 */

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

program.option('-o, --owner <name>', '[required] owner of the repository').option('-r, --repo <name>', '[required] name of the repository').option('-f, --future-release <version>', '[optional] specify the next release version').option('-t, --future-release-tag <name>', '[optional] specify the next release tag name if it is different from the release version').description('Run Github changelog generator.').parse(process.argv);

/**
 * Options.
 */

const concurrency = 20;
const { futureRelease, owner, repo } = program;
const futureReleaseTag = program.futureReleaseTag || futureRelease;
const token = process.env.GITHUB_TOKEN;

if (!owner || !repo) {
  process.stderr.write(`  Missing required options.\n${ program.helpInformation() }`);

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
}function writeChangelog(releases) {
  const changelog = ['# Changelog\n'];

  for (const release of releases) {
    changelog.push(`\n## [${ release.name }](${ release.html_url }) (${ release.created_at.format('YYYY-MM-DD') })\n`);

    for (const pr of release.prs) {
      changelog.push(`- ${ pr.title } [\\#${ pr.number }](${ pr.html_url }) ([${ pr.user.login }](${ pr.user.html_url }))\n`);
    }
  }

  changelog.forEach(line => process.stdout.write(line));
}run();