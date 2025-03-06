'use strict';

/**
 * Module dependencies.
 */

const { graphql } = require('@octokit/graphql');
const moment = require('moment');

/**
 * `ChangelogFetcher` class.
 */

class ChangelogFetcher {
  /**
   * Constructor.
   */

  constructor({
    base,
    changedFilesPrefix,
    futureRelease,
    futureReleaseTag,
    labels,
    owner,
    releaseTagPrefix,
    repo,
    token
  }) {
    this.base = base;
    this.changedFilesPrefix = changedFilesPrefix;
    this.futureRelease = futureRelease;
    this.futureReleaseTag = futureReleaseTag || futureRelease;
    this.releaseTagPrefix = releaseTagPrefix;
    this.labels = labels || [];
    this.owner = owner;
    this.repo = repo;
    this.client = graphql.defaults({
      baseUrl: 'https://api.github.com',
      headers: { authorization: `token ${token}` }
    });
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
    const latestRelease = this.releaseTagPrefix
      ? await this.getLatestReleaseByTagPrefix()
      : await this.getLatestRelease();

    if (latestRelease.tagName === this.futureReleaseTag) {
      throw new Error('Changelog already on the latest release');
    }

    // Get PRs up to the last release commit date.
    const pullRequests = await this.getPullRequestsStartingFrom(latestRelease.tagCommit.committedDate);

    return [
      {
        createdAt: moment.utc(),
        name: this.futureRelease,
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
    query getLatestRelease($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo){
        latestRelease {
          name,
          tagCommit {
            committedDate
          }
          tagName
          url
        }
        createdAt
      }
    }`;
    const result = await this.client(query, { owner: this.owner, repo: this.repo });

    // Extract release from nested result.
    const release = result.repository.latestRelease;

    // For shiny new repositories without releases, use the repository creation date instead.
    if (!release) {
      return { tagCommit: { committedDate: moment.utc(result.repository.createdAt) } };
    }

    // Transform string timestamp into moment.
    release.tagCommit.committedDate = moment.utc(release.tagCommit.committedDate);

    return release;
  }

  /**
   * Get the latest release by tag prefix.
   *
   * @return {Object} release - the latest release
   */
  async getLatestReleaseByTagPrefix() {
    let cursor = '';
    let hasMoreResults = true;
    let releases = [];
    let matchingRelease;

    do {
      ({ cursor, hasMoreResults, releases } = await this.getReleasesQuery(cursor));

      matchingRelease = releases[0];
    } while (!matchingRelease && hasMoreResults);

    // For shiny new repositories without releases, use the repository creation date instead.
    if (!matchingRelease) {
      const repositoryCreatedAt = await this.getRepositoryCreatedAt();

      return { tagCommit: { committedDate: repositoryCreatedAt } };
    }

    // Transform string timestamp into moment.
    matchingRelease.tagCommit.committedDate = moment.utc(matchingRelease.tagCommit.committedDate);

    return matchingRelease;
  }

  /**
   * Auxiliary function to iterate through list of PRs.
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

    const filesFragment = `
    files (first: 100) {
      nodes {
        path
      }
    }`;

    // TODO: replace orderBy from UPDATED_AT to MERGED_AT when available.
    const query = `
      query getPullRequests($owner: String!, $repo: String!, $first: Int!, $base: String!${cursorSignature}${labelsSignature}) {
        repository(owner: $owner, name: $repo) {
          pullRequests(baseRefName: $base,  first: $first, orderBy: {field: UPDATED_AT, direction: DESC}, states: [MERGED]${cursorParam}${labelsParam}) {
            nodes {
              mergedAt
              title
              number
              updatedAt
              url
              baseRefName
              author {
                login
                url
              }
              ${this.changedFilesPrefix ? filesFragment : ''}
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

    let pullRequests = result.repository.pullRequests.nodes;

    if (this.changedFilesPrefix) {
      pullRequests = pullRequests
        .filter(({ files }) => files.nodes.some(file => file.path.startsWith(this.changedFilesPrefix)))
        // eslint-disable-next-line no-unused-vars
        .map(({ files, ...rest }) => rest);
    }

    return {
      cursor: result.repository.pullRequests.pageInfo.endCursor,
      hasMoreResults: result.repository.pullRequests.pageInfo.hasNextPage,
      pullRequests
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
   * Auxiliary function to iterate through list of releases.
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
              tagName
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

    let releases = result.repository.releases.nodes;

    if (this.releaseTagPrefix) {
      releases = releases.filter(({ tagName }) => tagName.startsWith(this.releaseTagPrefix));
    }

    return {
      cursor: result.repository.releases.pageInfo.endCursor,
      hasMoreResults: result.repository.releases.pageInfo.hasNextPage,
      releases
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
      ({ cursor, hasMoreResults, releases } = await this.getReleasesQuery(cursor));

      result.push(
        ...releases.map(({ name, tagCommit, url }) => ({
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
      query getRepositoryCreatedAt($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          createdAt
        }
    }`;
    const result = await this.client(query, { owner: this.owner, repo: this.repo });

    return moment.utc(result.repository.createdAt);
  }
}

/**
 * Export `ChangelogFetcher`.
 */

module.exports = ChangelogFetcher;
