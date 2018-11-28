'use strict';

var _bluebird = require('bluebird');

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

/**
 * Module dependencies.
 */

const { assign, chain, flatMap, find, isEmpty, range } = require('lodash');
const Promise = require('bluebird');
const moment = require('moment');
const octokit = require('@octokit/rest');

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

  constructor({ base, futureRelease, futureReleaseTag, labels, owner, repo, token }) {
    this.base = base;
    this.futureRelease = futureRelease;
    this.futureReleaseTag = futureReleaseTag || futureRelease;
    this.labels = labels;
    this.owner = owner;
    this.repo = repo;
    this.client = octokit();

    this.client.authenticate({ token, type: 'token' });
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

  fetchChangelog() {
    var _this = this;

    return (0, _bluebird.coroutine)(function* () {
      const [releases, prs] = yield Promise.all([_this.getAllReleases(), _this.getAllPullRequests()]);

      prs.forEach(function (pr) {
        return _this.assignPullRequestToRelease(releases, pr);
      });

      return releases.reverse();
    })();
  }

  /**
   * Get all pull requests.
   */

  getAllPullRequests() {
    var _this2 = this;

    return (0, _bluebird.coroutine)(function* () {
      const options = {
        base: _this2.base,
        owner: _this2.owner,
        page: 1,
        per_page: 100,
        repo: _this2.repo,
        state: 'closed'
      };
      const prs = yield _this2.client.pullRequests.getAll(options);
      const nextPages = yield Promise.map(_this2.getNextPages(prs), function (page) {
        return _this2.client.pullRequests.getAll(_extends({}, options, { page }));
      }, { concurrency });

      return chain(prs.data).concat(flatMap(nextPages, 'data')).filter(function ({ labels }) {
        return isEmpty(_this2.labels) || !chain(labels).map('name').intersection(_this2.labels).isEmpty().value();
      }).map(function (pr) {
        return assign(pr, { merged_at: moment.utc(pr.merged_at) });
      }).sortBy(function (pr) {
        return pr.merged_at.unix();
      }).value();
    })();
  }

  /**
   * Get all releases.
   */

  getAllReleases() {
    var _this3 = this;

    return (0, _bluebird.coroutine)(function* () {
      const options = {
        owner: _this3.owner,
        page: 1,
        per_page: 100,
        repo: _this3.repo
      };

      const releases = yield _this3.client.repos.getReleases(options);

      if (_this3.futureRelease) {
        releases.data.unshift({
          created_at: moment().format(),
          html_url: `https://github.com/${_this3.owner}/${_this3.repo}/releases/tag/${_this3.futureReleaseTag}`,
          name: _this3.futureRelease
        });
      }

      const nextPages = yield Promise.map(_this3.getNextPages(releases), function (page) {
        return _this3.client.repos.getReleases(_extends({}, options, { page }));
      }, { concurrency });

      return chain(releases.data).concat(flatMap(nextPages, 'data')).map(function (release) {
        return assign(release, { created_at: moment.utc(release.created_at), prs: [] });
      }).sortBy(function (release) {
        return release.created_at.unix();
      }).value();
    })();
  }

  /**
   * Get the next pages.
   */

  getNextPages(response) {
    const lastPageUrl = this.client.hasLastPage(response);

    if (!lastPageUrl) {
      return [];
    }

    const lastPage = Number(lastPageUrl.match(/page=([0-9]+)/)[1]);

    return range(2, lastPage + 1);
  }
}

/**
 * Export `ChangelogFetcher`.
 */

module.exports = ChangelogFetcher;