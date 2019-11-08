'use strict';

/**
 * Module dependencies.
 */

const { assign, chain, find, isEmpty } = require('lodash');
const Octokit = require('@octokit/rest');
const Promise = require('bluebird');
const moment = require('moment');

/**
 * `ChangelogFetcher` class.
 */

class ChangelogFetcher {
  /**
   * Constructor.
   */

  constructor({ base, futureRelease, futureReleaseTag, labels, owner, repo, token }) {
    this.base = base;
    this.futureRelease = futureRelease;
    this.futureReleaseTag = futureReleaseTag || futureRelease;
    this.labels = labels;
    this.owner = owner;
    this.repo = repo;
    this.client = new Octokit({
      auth: `token ${token}`
    });
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
    const options = this.client.pulls.list.endpoint.merge({
      base: this.base,
      owner: this.owner,
      page: 1,
      per_page: 100,
      repo: this.repo,
      state: 'closed'
    });

    const prs = await this.client.paginate(options);

    return chain(prs)
      .filter(
        ({ labels }) =>
          isEmpty(this.labels) ||
          !chain(labels)
            .map('name')
            .intersection(this.labels)
            .isEmpty()
            .value()
      )
      .map(pr => assign(pr, { merged_at: moment.utc(pr.merged_at) }))
      .sortBy(pr => pr.merged_at.unix())
      .value();
  }

  /**
   * Get all releases.
   */

  async getAllReleases() {
    const options = this.client.repos.listReleases.endpoint.merge({
      owner: this.owner,
      page: 1,
      per_page: 100,
      repo: this.repo
    });

    const releases = await this.client.paginate(options);

    if (this.futureRelease) {
      releases.unshift({
        created_at: moment().format(),
        html_url: `https://github.com/${this.owner}/${this.repo}/releases/tag/${this.futureReleaseTag}`,
        name: this.futureRelease
      });
    }

    return chain(releases)
      .map(release => assign(release, { created_at: moment.utc(release.created_at), prs: [] }))
      .sortBy(release => release.created_at.unix())
      .value();
  }
}

/**
 * Export `ChangelogFetcher`.
 */

module.exports = ChangelogFetcher;
