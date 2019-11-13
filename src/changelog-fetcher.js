'use strict';

/**
 * Module dependencies.
 */

const { graphql } = require('@octokit/graphql');
const capitalize = require('lodash/capitalize');
const moment = require('moment');
const startsWith = require('lodash/startsWith');

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
    this.labels = labels || [];
    this.owner = owner;
    this.packageName = packageName;
    this.repo = repo;
    this.client = graphql.defaults({ headers: { authorization: `token ${token}` } });

    this.setDefaultValues();
  }

  /**
   * Fetch the full changelog.
   *
   * @return {Array} releases - An array of objects with information about the all releases
   */
  async fetchFullChangelog() {
    // Get the date the repository was created.
    const repositoryCreatedAt = await this.getRepositoryCreatedAt();

    // Get all releases.
    const releases = await this.getReleases();

    // Get all pull requests.
    const pullRequests = await this.getPullRequestsStartingFrom(repositoryCreatedAt);

    let cursor = 0;

    for (const pullRequest of pullRequests) {
      const mergedAt = moment.utc(pullRequest.mergedAt);

      let isAfterNextRelease = !releases[cursor + 1] || mergedAt.isAfter(releases[cursor + 1].createdAt);

      while (!isAfterNextRelease) {
        cursor += 1;
        isAfterNextRelease = !releases[cursor + 1] || mergedAt.isAfter(releases[cursor + 1].createdAt);
      }

      const isBeforeCurrentRelease = mergedAt.isSameOrBefore(releases[cursor].createdAt);

      if (isBeforeCurrentRelease) {
        releases[cursor].pullRequests.push(pullRequest);
      }
    }

    return releases;
  }

  /**
   * Fetch changelog after the latest release.
   *
   * @return {Array} releases - An array with an object with information about the latest release
   */
  async fetchLatestChangelog() {
    // Don't do anything if a futureRelease was not specified.
    if (!this.futureRelease) {
      return [];
    }

    // Get the latest release.
    const latestRelease = this.packageName ? await this.getLatestPackageRelease() : await this.getLatestRelease();

    if (latestRelease.tagName === this.futureReleaseTag) {
      throw new Error('Changelog already on the latest release');
    }

    // Get PRs up to the last release commit date.
    const pullRequests = await this.getPullRequestsStartingFrom(latestRelease.tagCommit.committedDate);

    return [
      {
        createdAt: moment.utc(),
        name: this.futureReleaseName,
        pullRequests,
        url: `https://github.com/${this.owner}/${this.repo}/releases/tag/${this.futureReleaseTag}`
      }
    ];
  }

  /**
   * Get the latest release.
   *
   * @return {Object} release - the latest release
   */
  async getLatestRelease() {
    const query = `
    query latestRelease($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo){
        latestRelease {
          tagCommit {
            committedDate
          }
          tagName
        }
      }
    }`;
    const result = await this.client(query, { owner: this.owner, repo: this.repo });

    // Extract release from nested result.
    const release = result.repository.latestRelease;

    // Transform string timestamp into moment.
    release.tagCommit.committedDate = moment.utc(release.tagCommit.committedDate);

    return release;
  }

  /**
   * Get the latest package release.
   *
   * @return {Object} release - the latest package release
   */
  async getLatestPackageRelease() {
    const query = `
    query latestRelease($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo){
        refs(query: "${this.packageName}", refPrefix: "refs/tags/", last:1)
        {
          edges {
            node {
              name
            }
          }
        }
      }
    }`;

    const result = await this.client(query, { owner: this.owner, repo: this.repo });

    const tagName = result.repository.refs.edges[0].node.name;

    const releaseQuery = `
    query latestRelease($owner: String!, $repo: String!, $tagName: String!) {
      repository(owner: $owner, name: $repo){
        release(tagName: $tagName) {
          createdAt
        }
      }
    }`;

    const resultRelease = await this.client(releaseQuery, {
      owner: this.owner,
      repo: this.repo,
      tagName
    });

    const committedDate = resultRelease.repository.release.createdAt;

    return {
      tagCommit: {
        committedDate: moment.utc(committedDate),
      },
      tagName
    };
  }

  /**
   * Auxiliary function to iterage through list of PRs.
   *
   * @param {String} cursor - the cursor from where the function will get the PRs
   * @param {Number} pageSize - the number of results we try to fetch each time
   * @return {Map} {cursor, hasMoreResults, pullRequests} - An array of maps with information about the last PRs
   *                                                        starting from cursor (from newest to oldest)
   */
  async getPullRequestsQuery(cursor = '', pageSize = 30) {
    const [cursorSignature, cursorParam] = cursor ? [', $cursor: String!', ', after: $cursor'] : ['', ''];

    const [labelsSignature, labelsParam] =
      this.labels.length === 0 ? ['', ''] : [', $labels: [String!]', ', labels: $labels'];

    // TODO: replace orderBy from UPDATED_AT to MERGED_AT when available.
    const query = `
      query pullRequestsBefore($owner: String!, $repo: String!, $first: Int!, $base: String!${cursorSignature}${labelsSignature}) {
        repository(owner: $owner, name: $repo) {
          pullRequests(baseRefName: $base,  first: $first, orderBy: {field: UPDATED_AT, direction: DESC}, states: [MERGED]${cursorParam}${labelsParam}) {
            nodes {
              mergedAt
              title
              number
              updatedAt
              url
              baseRefName
              author{
                login
                url
              }
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }`;
    const result = await this.client(query, {
      base: this.base,
      cursor,
      first: pageSize,
      labels: this.labels,
      owner: this.owner,
      repo: this.repo
    });

    return {
      cursor: result.repository.pullRequests.pageInfo.endCursor,
      hasMoreResults: result.repository.pullRequests.pageInfo.hasNextPage,
      pullRequests: result.repository.pullRequests.nodes
    };
  }

  /**
   * Get the list of approved pull requests merged after a given timestamp.
   *
   * @param {moment} startDate - the timestamp of the release after which we want to retrieve the pull requests
   * @return {Array} pullRequests - An array of maps with information about the pull requests
   */
  async getPullRequestsStartingFrom(startDate) {
    const result = [];
    let stop = false;
    let hasMoreResults = true;
    let cursor = '';
    let pullRequests = [];

    while (!stop && hasMoreResults) {
      ({ cursor, hasMoreResults, pullRequests } = await this.getPullRequestsQuery(cursor));

      for (let i = 0; i < pullRequests.length; i++) {
        // If PR was merged after the release timestamp, save it to the result.
        if (startDate.isBefore(pullRequests[i].mergedAt)) {
          result.push(pullRequests[i]);
        } else if (startDate.isAfter(pullRequests[i].updatedAt)) {
          // Stop the iteration.
          stop = true;
          break;
        }
      }
    }

    // eslint-disable-next-line id-length
    return result.sort((a, b) => moment(b.mergedAt).diff(a.mergedAt));
  }

  /**
   * Auxiliary function to iterage through list of releases.
   *
   * @param {String} cursor - the cursor from where the function will get the releases
   * @param {Number} pageSize - the number of results we try to fetch each time
   * @return {Map} {cursor, hasMoreResults, releases} - An array of maps with information about the last releases
   *                                                    starting from cursor (from newest to oldest)
   */
  async getReleasesQuery(cursor = '', pageSize = 30) {
    const [cursorSignature, cursorParam] = cursor ? [', $cursor: String!', ', after: $cursor'] : ['', ''];
    const query = `
      query getReleases($owner: String!, $repo: String!, $first: Int!${cursorSignature}) {
        repository(owner: $owner, name: $repo) {
          releases(first: $first, orderBy: {field: CREATED_AT, direction: DESC}${cursorParam}) {
            nodes {
              name
              tagCommit {
                committedDate
              }
              url
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }`;
    const result = await this.client(query, {
      cursor,
      first: pageSize,
      owner: this.owner,
      repo: this.repo
    });

    return {
      cursor: result.repository.releases.pageInfo.endCursor,
      hasMoreResults: result.repository.releases.pageInfo.hasNextPage,
      releases: result.repository.releases.nodes
    };
  }

  /**
   * Get the list of all releases of the repository.
   *
   * @return {Array} releases - An array of objects with information about the releases
   */
  async getReleases() {
    const result = [];
    let cursor = '';
    let hasMoreResults = true;
    let releases = [];

    do {
      ({ releases, cursor, hasMoreResults } = await this.getReleasesQuery(cursor));

      result.push(
        ...releases
          .filter(({ name }) => !this.packageName || startsWith(name.toLowerCase(), this.packageName.toLowerCase()))
          .map(({ name, tagCommit, url }) => ({
            createdAt: moment(tagCommit.committedDate),
            name,
            pullRequests: [],
            url
          }))
      );
    } while (hasMoreResults);

    return result;
  }

  /**
   * Get the date that the repository was created.
   *
   * @return {moment} createdAt - the date the repository was created
   */
  async getRepositoryCreatedAt() {
    const query = `
      query repositoryCreation($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          createdAt
        }
    }`;
    const result = await this.client(query, { owner: this.owner, repo: this.repo });

    return moment.utc(result.repository.createdAt);
  }

  /**
   * Get `futureReleaseName`.
   */

  getFutureReleaseName() {
    if (!this.packageName) {
      return this.futureRelease;
    }

    return `${capitalize(this.packageName)} ${this.futureRelease}`;
  }

  /**
   * Get `futureReleaseTag`.
   */

  getFutureReleaseTag() {
    if (this.futureReleaseTag) {
      return this.futureReleaseTag;
    }

    if (!this.packageName) {
      return this.futureRelease;
    }

    return `${this.packageName.toLowerCase()}-${this.futureRelease}`;
  }

  /**
   * Get `labels`.
   */

  getLabels() {
    if (!this.packageName) {
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
