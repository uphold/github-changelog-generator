
/**
 * Module dependencies.
 */

const { getReleases, getPullRequests } = require('src/github-client');
const nock = require('nock');

/**
 * Test `GitHubClient`.
 */

describe('GitHubClient', () => {
  describe('getReleases()', () => {
    it('should request the repo releases to the authenticated GitHub API', async () => {
      nock('https://api.github.com', {
          reqheaders: {
            authorization: 'token foo'
          }
        })
        .get('/repos/bar/biz/releases')
        .query({ page: 5, per_page: 50 })
        .reply(200);

      await getReleases({ owner: 'bar', page: 5, perPage: 50, repo: 'biz', token: 'foo' });
    });

    it('should default pagination to page 1 with 100 entries', async () => {
      nock('https://api.github.com')
        .get('/repos/bar/biz/releases')
        .query({ page: 1, per_page: 100 })
        .reply(200);

      await getReleases({ owner: 'bar', repo: 'biz', token: 'foo' });
    });

    it('should return the GitHub API response', async () => {
      nock('https://api.github.com')
        .get('/repos/bar/biz/releases')
        .query({ page: 1, per_page: 100 })
        .reply(200, { foo: 'bar' });

      const result = await getReleases({ owner: 'bar', repo: 'biz', token: 'foo' });

      expect(result).toEqual({ foo: 'bar', meta: {} });
    });
  });

  describe('getPullRequests()', () => {
    it('should request the repo pull requests to the authenticated GitHub API', async () => {
      nock('https://api.github.com', {
          reqheaders: {
            authorization: 'token foo'
          }
        })
        .get('/repos/bar/biz/pulls')
        .query({ base: 'master', page: 5, per_page: 50, state: 'closed' })
        .reply(200);

      await getPullRequests({ base: 'master', owner: 'bar', page: 5, perPage: 50, repo: 'biz', state: 'closed', token: 'foo' });
    });

    it('should default pagination to page 1 with 100 entries', async () => {
      nock('https://api.github.com')
        .get('/repos/bar/biz/pulls')
        .query({ base: 'master', page: 1, per_page: 100, state: 'closed' })
        .reply(200);

      await getPullRequests({ base: 'master', owner: 'bar', repo: 'biz', state: 'closed', token: 'foo' });
    });

    it('should return the GitHub API response', async () => {
      nock('https://api.github.com')
        .get('/repos/bar/biz/pulls')
        .query({ base: 'master', page: 1, per_page: 100, state: 'closed' })
        .reply(200, { foo: 'bar' });

      const result = await getPullRequests({ base: 'master', owner: 'bar', repo: 'biz', state: 'closed', token: 'foo' });

      expect(result).toEqual({ foo: 'bar', meta: {} });
    });
  });
});
