
/**
 * Module dependencies.
 */

const GitHubApi = require('github');
const Promise = require('bluebird');

/**
 * Export `GitHubClient`.
 */

module.exports = {
  /**
   * Get Pull Requests.
   */

  getPullRequests: ({ base, owner, page = 1, perPage = 100, repo, state, token }) => {
    const client = new GitHubApi({ Promise });

    client.authenticate({ token, type: 'token' });

    return client.pullRequests.getAll({ base, owner, page, per_page: perPage, repo, state });
  },

  /**
   * Get releases.
   */

  getReleases: ({ owner, page = 1, perPage = 100, repo, token }) => {
    const client = new GitHubApi({ Promise });

    client.authenticate({ token, type: 'token' });

    return client.repos.getReleases({ owner, page, per_page: perPage, repo });
  }
};
