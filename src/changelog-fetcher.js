'use strict';

/**
 * Module dependencies.
 */

const _ = require('lodash');
const { Octokit } = require('@octokit/rest');
const moment = require('moment');

/**
 * `ChangelogFetcher` class.
 */

class ChangelogFetcher {
  /**
   * Constructor.
   */

  constructor({ base, futureRelease, futureReleaseTag, labels = [], owner, packageName, repo, token }) {
    this.base = base;
    this.futureRelease = futureRelease;
    this.futureReleaseTag = futureReleaseTag;
    this.labels = labels;
    this.owner = owner;
    this.packageName = packageName;
    this.repo = repo;
    this.client = new Octokit({
      auth: `token ${token}`
    });

    this.setDefaultValues();
  }

  /**
   * Assign pull request to release.
   */

  assignPullRequestToRelease(releases, pr) {
    const release = releases.find(release => pr.merged_at.isSameOrBefore(release.created_at));

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
    const prs = await this.client.paginate(
      this.client.pulls.list.endpoint.merge({
        base: this.base,
        owner: this.owner,
        page: 1,
        per_page: 100,
        repo: this.repo,
        state: 'closed'
      })
    );

    return _(prs)
      .filter(
        ({ labels }) =>
          _.isEmpty(this.labels) ||
          !_(labels)
            .map('name')
            .intersection(this.labels)
            .isEmpty()
      )
      .map(pr => ({ ...pr, merged_at: moment.utc(pr.merged_at) }))
      .sortBy(pr => pr.merged_at.unix())
      .value();
  }

  /**
   * Get all releases.
   */

  async getAllReleases() {
    const releases = await this.client.paginate(
      this.client.repos.listReleases.endpoint.merge({
        owner: this.owner,
        page: 1,
        per_page: 100,
        repo: this.repo
      })
    );

    if (this.futureRelease) {
      releases.unshift({
        created_at: moment().format(),
        html_url: `https://github.com/${this.owner}/${this.repo}/releases/tag/${this.futureReleaseTag}`,
        name: this.futureReleaseName
      });
    }

    return _(releases)
      .filter(({ name }) => _.isEmpty(this.packageName) || _.startsWith(_.toLower(name), _.toLower(this.packageName)))
      .map(release => ({ ...release, created_at: moment.utc(release.created_at), prs: [] }))
      .sortBy(release => release.created_at.unix())
      .value();
  }

  /**
   * Get `futureReleaseName`.
   */

  getFutureReleaseName() {
    if (_.isEmpty(this.packageName)) {
      return this.futureRelease;
    }

    return `${_.capitalize(this.packageName)} ${this.futureRelease}`;
  }

  /**
   * Get `futureReleaseTag`.
   */

  getFutureReleaseTag() {
    if (this.futureReleaseTag) {
      return this.futureReleaseTag;
    }

    if (_.isEmpty(this.packageName)) {
      return this.futureRelease;
    }

    return `${_.toLower(this.packageName)}-${this.futureRelease}`;
  }

  /**
   * Get `labels`.
   */

  getLabels() {
    if (_.isEmpty(this.packageName)) {
      return this.labels;
    }

    this.labels.push(this.packageName);

    return this.labels;
  }

  /**
   * Set default values.
   */

  setDefaultValues() {
    this.futureReleaseName = this.getFutureReleaseName();
    this.futureReleaseTag = this.getFutureReleaseTag();
    this.labels = this.getLabels();
  }
}

/**
 * Export `ChangelogFetcher`.
 */

module.exports = ChangelogFetcher;
