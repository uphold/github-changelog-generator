
/**
 * Module dependencies.
 */

const { assign, chain, has, flatten, find, range } = require('lodash');
const { getReleases, getPullRequests } = require('./github-client');
const Promise = require('bluebird');
const moment = require('moment');

/**
 * Constants.
 */

const concurrency = 20;

/**
 * `ChangelogFetcher` class.
 */

class ChangelogFetcher {
  /**
   * Constructor.
   */

  constructor({ base, futureRelease, futureReleaseTag, owner, repo, token }) {
    this.base = base;
    this.futureRelease = futureRelease;
    this.futureReleaseTag = futureReleaseTag || futureRelease;
    this.owner = owner;
    this.repo = repo;
    this.token = token;
  }

  /**
   * Assign pull request to release.
   */

  assignPullRequestToRelease(releases, pr) {
    const release = find(releases, release => pr.merged_at.isSameOrBefore(release.created_at));

    if (release) {
      release.prs.unshift(pr);
    }
  }

  /**
   * Fetch changelog.
   */

  async fetchChangelog() {
    const [releases, prs] = await Promise.all([this.getAllReleases(), this.getAllPullRequests()]);

    prs.forEach(pr => this.assignPullRequestToRelease(releases, pr));

    return releases.reverse();
  }

  /**
   * Get all pull requests.
   */

  async getAllPullRequests() {
    const options = {
      base: this.base,
      owner: this.owner,
      repo: this.repo,
      state: 'closed',
      token: this.token
    };
    const prs = await getPullRequests(options);
    const nextPages = await Promise.map(this.getNextPages(prs).map(page => ({ page, ...options })), getPullRequests, { concurrency });

    return chain(prs)
      .concat(flatten(nextPages))
      .map(pr => assign(pr, { merged_at: moment.utc(pr.merged_at) }))
      .sortBy(pr => pr.merged_at.unix())
      .value();
  }

  /**
   * Get all releases.
   */

  async getAllReleases() {
    const options = {
      owner: this.owner,
      repo: this.repo,
      token: this.token
    };
    const releases = await getReleases(options);

    if (this.futureRelease) {
      releases.unshift({
        created_at: moment().format(),
        html_url: `https://github.com/${this.owner}/${this.repo}/releases/tag/${this.futureReleaseTag}`,
        name: this.futureRelease
      });
    }

    const nextPages = await Promise.map(this.getNextPages(releases).map(page => ({ page, ...options })), getReleases, { concurrency });

    return chain(releases)
      .concat(flatten(nextPages))
      .map(release => assign(release, { created_at: moment.utc(release.created_at), prs: [] }))
      .sortBy(release => release.created_at.unix())
      .value();
  }

  /**
   * Get the next pages.
   */

  getNextPages(results) {
    let lastPage = 1;

    if (has(results, 'meta.link')) {
      lastPage = Number(results.meta.link.match(/<[^>]+[&?]page=([0-9]+)[^>]+>; rel="last"/)[1]);
    }

    return range(2, lastPage + 1);
  }
}

/**
 * Export `ChangelogFetcher`.
 */

module.exports = ChangelogFetcher;
