'use strict';

/**
 * Module dependencies.
 */

const ChangelogFetcher = require('../src/changelog-fetcher');
const moment = require('moment');
const nock = require('nock');

/**
 * Test `ChangelogFetcher`.
 */

describe('ChangelogFetcher', () => {
  function getDataForRequest(requestBody, split = false) {
    const { query, variables } = requestBody;

    if (/query getLatestRelease\(/.test(query)) {
      return {
        data: {
          repository: {
            createdAt: moment('2017-10-22T12').toISOString(),
            latestRelease: {
              name: 'latest-release',
              tagCommit: {
                committedDate: moment('2018-10-22T12').toISOString()
              },
              tagName: 'latest-release',
              url: 'latest-release-url'
            }
          }
        }
      };
    } else if (/query getPullRequests\(/.test(query)) {
      const maybeIncludeFiles = files => (query.includes('files (') ? { files: { nodes: files } } : {});
      const allNodes = [
        {
          author: { login: 'quxfoo-user-login', url: 'quxfoo-user-url' },
          mergedAt: moment('2018-10-24T10').toISOString(),
          number: 'quxfoo-number',
          title: 'quxfoo-title',
          updatedAt: moment('2018-10-24T10').toISOString(),
          url: 'quxfoo-url',
          ...maybeIncludeFiles([{ path: 'packages/quxfoo/index.js' }])
        },
        {
          author: { login: 'foobar-user-login', url: 'foobar-user-url' },
          mergedAt: moment('2018-10-23T10').toISOString(),
          number: 'foobar-number',
          title: 'foobar-title',
          updatedAt: moment('2018-10-23T10').toISOString(),
          url: 'foobar-url',
          ...maybeIncludeFiles([{ path: 'packages/foobar/index.js' }])
        },
        {
          author: { login: 'foobiz-user-login', url: 'foobiz-user-url' },
          mergedAt: moment('2018-10-22T20').toISOString(),
          number: 'foobiz-number',
          title: 'foobiz-title',
          updatedAt: moment('2018-10-22T20').toISOString(),
          url: 'foobiz-url',
          ...maybeIncludeFiles([{ path: 'packages/foobiz/index.js' }])
        },
        {
          author: { login: 'barbuz-user-login', url: 'barbuz-user-url' },
          mergedAt: moment('2018-10-21T05').toISOString(),
          number: 'barbuz-number',
          title: 'barbuz-title',
          updatedAt: moment('2018-10-22T15').toISOString(),
          url: 'barbuz-url',
          ...maybeIncludeFiles([{ path: 'packages/barbuz/index.js' }])
        },
        {
          author: { login: 'barbiz-user-login', url: 'barbiz-user-url' },
          mergedAt: moment('2018-10-22T10').toISOString(),
          number: 'barbiz-number',
          title: 'barbiz-title',
          updatedAt: moment('2018-10-22T10').toISOString(),
          url: 'barbiz-url',
          ...maybeIncludeFiles([{ path: 'packages/barbiz/index.js' }])
        }
      ];

      // Return the full list of nodes if not testing cursor, else return the list in two parts.
      // We know we should pass the second part if the cursor variable is not empty.
      let nodes = allNodes;

      if (split) {
        nodes = variables.cursor ? allNodes.slice(2) : allNodes.slice(0, 2);
      }

      if (variables.labels.length) {
        nodes = [allNodes[0], allNodes[2], allNodes[4]];
      }

      return {
        data: {
          repository: {
            pullRequests: {
              nodes,
              pageInfo: {
                endCursor: 'endCursorVal',
                hasNextPage: split && !variables.cursor
              }
            }
          }
        }
      };
    } else if (/query getRepositoryCreatedAt\(/.test(query)) {
      return {
        data: {
          repository: {
            createdAt: moment('2018-10-20T12').toISOString()
          }
        }
      };
    } else if (/query getReleases\(/.test(query)) {
      const allNodes = [
        {
          name: 'foobar-name',
          tagCommit: {
            committedDate: moment('2018-10-23T12').toISOString()
          },
          tagName: 'foobar-name',
          url: 'foobar-url'
        },
        {
          name: 'bizbaz-name',
          tagCommit: {
            committedDate: moment('2018-10-22T12').toISOString()
          },
          tagName: 'bizbaz-name',
          url: 'bizbaz-url'
        }
      ];

      let nodes = allNodes;

      if (split) {
        nodes = variables.cursor ? allNodes.slice(1) : allNodes.slice(0, 1);
      }

      return {
        data: {
          repository: {
            releases: {
              nodes,
              pageInfo: {
                endCursor: 'endCursorVal',
                hasNextPage: split && !variables.cursor
              }
            }
          }
        }
      };
    }

    throw new Error('Unexpected requestBody');
  }

  describe('constructor()', () => {
    it('should set all defined fields', () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        changedFilesPrefix: 'foz',
        futureRelease: 'bar',
        futureReleaseTag: 'baz',
        labels: 'bez',
        owner: 'biz',
        releaseTagPrefix: 'boz',
        repo: 'buz',
        token: 'qux'
      });

      expect(fetcher.base).toEqual('foo');
      expect(fetcher.changedFilesPrefix).toEqual('foz');
      expect(fetcher.futureRelease).toEqual('bar');
      expect(fetcher.futureReleaseTag).toEqual('baz');
      expect(fetcher.labels).toEqual('bez');
      expect(fetcher.owner).toEqual('biz');
      expect(fetcher.releaseTagPrefix).toEqual('boz');
      expect(fetcher.repo).toEqual('buz');
    });

    it('should set default values', () => {
      const fetcher = new ChangelogFetcher({
        futureRelease: 'foo',
        token: 'bar'
      });

      expect(fetcher.futureReleaseTag).toEqual('foo');
    });
  });

  describe('fetchFullChangelog()', () => {
    it('should return a list with all releases and the pull requests associated to them', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .times(3)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const releases = await fetcher.fetchFullChangelog();

      expect(releases).toEqual([
        {
          createdAt: moment(moment('2018-10-23T12').toISOString()),
          name: 'foobar-name',
          pullRequests: [
            {
              author: { login: 'foobar-user-login', url: 'foobar-user-url' },
              mergedAt: moment('2018-10-23T10').toISOString(),
              number: 'foobar-number',
              title: 'foobar-title',
              updatedAt: moment('2018-10-23T10').toISOString(),
              url: 'foobar-url'
            },
            {
              author: { login: 'foobiz-user-login', url: 'foobiz-user-url' },
              mergedAt: moment('2018-10-22T20').toISOString(),
              number: 'foobiz-number',
              title: 'foobiz-title',
              updatedAt: moment('2018-10-22T20').toISOString(),
              url: 'foobiz-url'
            }
          ],
          url: 'foobar-url'
        },
        {
          createdAt: moment(moment('2018-10-22T12').toISOString()),
          name: 'bizbaz-name',
          pullRequests: [
            {
              author: { login: 'barbiz-user-login', url: 'barbiz-user-url' },
              mergedAt: moment('2018-10-22T10').toISOString(),
              number: 'barbiz-number',
              title: 'barbiz-title',
              updatedAt: moment('2018-10-22T10').toISOString(),
              url: 'barbiz-url'
            },
            {
              author: { login: 'barbuz-user-login', url: 'barbuz-user-url' },
              mergedAt: moment('2018-10-21T05').toISOString(),
              number: 'barbuz-number',
              title: 'barbuz-title',
              updatedAt: moment('2018-10-22T15').toISOString(),
              url: 'barbuz-url'
            }
          ],
          url: 'bizbaz-url'
        }
      ]);
    });

    it('should handle pagination correctly', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .times(5)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody, true));

      const releases = await fetcher.fetchFullChangelog();

      expect(releases).toEqual([
        {
          createdAt: moment(moment('2018-10-23T12').toISOString()),
          name: 'foobar-name',
          pullRequests: [
            {
              author: { login: 'foobar-user-login', url: 'foobar-user-url' },
              mergedAt: moment('2018-10-23T10').toISOString(),
              number: 'foobar-number',
              title: 'foobar-title',
              updatedAt: moment('2018-10-23T10').toISOString(),
              url: 'foobar-url'
            },
            {
              author: { login: 'foobiz-user-login', url: 'foobiz-user-url' },
              mergedAt: moment('2018-10-22T20').toISOString(),
              number: 'foobiz-number',
              title: 'foobiz-title',
              updatedAt: moment('2018-10-22T20').toISOString(),
              url: 'foobiz-url'
            }
          ],
          url: 'foobar-url'
        },
        {
          createdAt: moment(moment('2018-10-22T12').toISOString()),
          name: 'bizbaz-name',
          pullRequests: [
            {
              author: { login: 'barbiz-user-login', url: 'barbiz-user-url' },
              mergedAt: moment('2018-10-22T10').toISOString(),
              number: 'barbiz-number',
              title: 'barbiz-title',
              updatedAt: moment('2018-10-22T10').toISOString(),
              url: 'barbiz-url'
            },
            {
              author: { login: 'barbuz-user-login', url: 'barbuz-user-url' },
              mergedAt: moment('2018-10-21T05').toISOString(),
              number: 'barbuz-number',
              title: 'barbuz-title',
              updatedAt: moment('2018-10-22T15').toISOString(),
              url: 'barbuz-url'
            }
          ],
          url: 'bizbaz-url'
        }
      ]);
    });

    it('should filter releases by the given releaseTagPrefix', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        owner: 'biz',
        releaseTagPrefix: 'foobar-',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .times(3)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const releases = await fetcher.fetchFullChangelog();

      expect(releases).toEqual([
        {
          createdAt: moment(moment('2018-10-23T12').toISOString()),
          name: 'foobar-name',
          pullRequests: [
            {
              author: { login: 'foobar-user-login', url: 'foobar-user-url' },
              mergedAt: moment('2018-10-23T10').toISOString(),
              number: 'foobar-number',
              title: 'foobar-title',
              updatedAt: moment('2018-10-23T10').toISOString(),
              url: 'foobar-url'
            },
            {
              author: { login: 'foobiz-user-login', url: 'foobiz-user-url' },
              mergedAt: moment('2018-10-22T20').toISOString(),
              number: 'foobiz-number',
              title: 'foobiz-title',
              updatedAt: moment('2018-10-22T20').toISOString(),
              url: 'foobiz-url'
            },
            {
              author: { login: 'barbiz-user-login', url: 'barbiz-user-url' },
              mergedAt: moment('2018-10-22T10').toISOString(),
              number: 'barbiz-number',
              title: 'barbiz-title',
              updatedAt: moment('2018-10-22T10').toISOString(),
              url: 'barbiz-url'
            },
            {
              author: { login: 'barbuz-user-login', url: 'barbuz-user-url' },
              mergedAt: moment('2018-10-21T05').toISOString(),
              number: 'barbuz-number',
              title: 'barbuz-title',
              updatedAt: moment('2018-10-22T15').toISOString(),
              url: 'barbuz-url'
            }
          ],
          url: 'foobar-url'
        }
      ]);
    });

    it('should filter pull requests by the given labels', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        futureRelease: 'futRel',
        labels: ['fizz', 'fuzz'],
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .times(3)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const releases = await fetcher.fetchFullChangelog();

      expect(releases).toEqual([
        {
          createdAt: moment(moment('2018-10-23T12').toISOString()),
          name: 'foobar-name',
          pullRequests: [
            {
              author: { login: 'foobiz-user-login', url: 'foobiz-user-url' },
              mergedAt: moment('2018-10-22T20').toISOString(),
              number: 'foobiz-number',
              title: 'foobiz-title',
              updatedAt: moment('2018-10-22T20').toISOString(),
              url: 'foobiz-url'
            }
          ],
          url: 'foobar-url'
        },
        {
          createdAt: moment(moment('2018-10-22T12').toISOString()),
          name: 'bizbaz-name',
          pullRequests: [
            {
              author: { login: 'barbiz-user-login', url: 'barbiz-user-url' },
              mergedAt: moment('2018-10-22T10').toISOString(),
              number: 'barbiz-number',
              title: 'barbiz-title',
              updatedAt: moment('2018-10-22T10').toISOString(),
              url: 'barbiz-url'
            }
          ],
          url: 'bizbaz-url'
        }
      ]);
    });

    it('should filter pull requests by the given changedFilesPrefix', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        changedFilesPrefix: 'packages/foobar/',
        futureRelease: 'futRel',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .times(3)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const releases = await fetcher.fetchFullChangelog();

      expect(releases).toEqual([
        {
          createdAt: moment(moment('2018-10-23T12').toISOString()),
          name: 'foobar-name',
          pullRequests: [
            {
              author: { login: 'foobar-user-login', url: 'foobar-user-url' },
              mergedAt: moment('2018-10-23T10').toISOString(),
              number: 'foobar-number',
              title: 'foobar-title',
              updatedAt: moment('2018-10-23T10').toISOString(),
              url: 'foobar-url'
            }
          ],
          url: 'foobar-url'
        },
        {
          createdAt: moment(moment('2018-10-22T12').toISOString()),
          name: 'bizbaz-name',
          pullRequests: [],
          url: 'bizbaz-url'
        }
      ]);
    });
  });

  describe('fetchLatestChangelog()', () => {
    it('should not return any releases unless you specify a futureRelease', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });
      const releases = await fetcher.fetchLatestChangelog();

      expect(releases).toEqual([]);
    });

    it('should throw an error if the futureReleaseTag is already the latest release', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        futureRelease: 'bar',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      jest.spyOn(fetcher, 'client').mockReturnValue({
        repository: {
          latestRelease: {
            tagCommit: {
              committedDate: moment('2018-10-22T12').toISOString()
            },
            tagName: 'bar'
          }
        }
      });

      try {
        await fetcher.fetchLatestChangelog();

        jest.fail();
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe('Changelog already on the latest release');
      }
    });

    it('should return a list with the last release and the pull requests done after the last release was created', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        futureRelease: 'futRel',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .times(2)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const releases = await fetcher.fetchLatestChangelog();

      expect(releases).toEqual([
        {
          createdAt: expect.any(moment),
          name: 'futRel',
          pullRequests: [
            {
              author: { login: 'quxfoo-user-login', url: 'quxfoo-user-url' },
              mergedAt: moment('2018-10-24T10').toISOString(),
              number: 'quxfoo-number',
              title: 'quxfoo-title',
              updatedAt: moment('2018-10-24T10').toISOString(),
              url: 'quxfoo-url'
            },
            {
              author: { login: 'foobar-user-login', url: 'foobar-user-url' },
              mergedAt: moment('2018-10-23T10').toISOString(),
              number: 'foobar-number',
              title: 'foobar-title',
              updatedAt: moment('2018-10-23T10').toISOString(),
              url: 'foobar-url'
            },
            {
              author: { login: 'foobiz-user-login', url: 'foobiz-user-url' },
              mergedAt: moment('2018-10-22T20').toISOString(),
              number: 'foobiz-number',
              title: 'foobiz-title',
              updatedAt: moment('2018-10-22T20').toISOString(),
              url: 'foobiz-url'
            }
          ],
          url: 'https://github.com/biz/buz/releases/tag/futRel'
        }
      ]);
    });

    it('should handle pagination correctly', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        futureRelease: 'futRel',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .times(3)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody, true));

      const releases = await fetcher.fetchLatestChangelog();

      expect(releases).toEqual([
        {
          createdAt: expect.any(moment),
          name: 'futRel',
          pullRequests: [
            {
              author: { login: 'quxfoo-user-login', url: 'quxfoo-user-url' },
              mergedAt: moment('2018-10-24T10').toISOString(),
              number: 'quxfoo-number',
              title: 'quxfoo-title',
              updatedAt: moment('2018-10-24T10').toISOString(),
              url: 'quxfoo-url'
            },
            {
              author: { login: 'foobar-user-login', url: 'foobar-user-url' },
              mergedAt: moment('2018-10-23T10').toISOString(),
              number: 'foobar-number',
              title: 'foobar-title',
              updatedAt: moment('2018-10-23T10').toISOString(),
              url: 'foobar-url'
            },
            {
              author: { login: 'foobiz-user-login', url: 'foobiz-user-url' },
              mergedAt: moment('2018-10-22T20').toISOString(),
              number: 'foobiz-number',
              title: 'foobiz-title',
              updatedAt: moment('2018-10-22T20').toISOString(),
              url: 'foobiz-url'
            }
          ],
          url: 'https://github.com/biz/buz/releases/tag/futRel'
        }
      ]);
    });

    it('should filter releases by the given releaseTagPrefix', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        futureRelease: 'futRel',
        owner: 'biz',
        releaseTagPrefix: 'foobar-',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .times(2)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const releases = await fetcher.fetchLatestChangelog();

      expect(releases).toEqual([
        {
          createdAt: expect.any(moment),
          name: 'futRel',
          pullRequests: [
            {
              author: { login: 'quxfoo-user-login', url: 'quxfoo-user-url' },
              mergedAt: moment('2018-10-24T10').toISOString(),
              number: 'quxfoo-number',
              title: 'quxfoo-title',
              updatedAt: moment('2018-10-24T10').toISOString(),
              url: 'quxfoo-url'
            }
          ],
          url: 'https://github.com/biz/buz/releases/tag/futRel'
        }
      ]);
    });

    it('should filter pull requests by the given labels', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        futureRelease: 'futRel',
        labels: ['fizz', 'fuzz'],
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .times(2)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const releases = await fetcher.fetchLatestChangelog();

      expect(releases).toEqual([
        {
          createdAt: expect.any(moment),
          name: 'futRel',
          pullRequests: [
            {
              author: { login: 'quxfoo-user-login', url: 'quxfoo-user-url' },
              mergedAt: moment('2018-10-24T10').toISOString(),
              number: 'quxfoo-number',
              title: 'quxfoo-title',
              updatedAt: moment('2018-10-24T10').toISOString(),
              url: 'quxfoo-url'
            },
            {
              author: { login: 'foobiz-user-login', url: 'foobiz-user-url' },
              mergedAt: moment('2018-10-22T20').toISOString(),
              number: 'foobiz-number',
              title: 'foobiz-title',
              updatedAt: moment('2018-10-22T20').toISOString(),
              url: 'foobiz-url'
            }
          ],
          url: 'https://github.com/biz/buz/releases/tag/futRel'
        }
      ]);
    });

    it('should filter pull requests by the given changedFilesPrefix', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        changedFilesPrefix: 'packages/foobar/',
        futureRelease: 'futRel',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .times(2)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const releases = await fetcher.fetchLatestChangelog();

      expect(releases).toEqual([
        {
          createdAt: expect.any(moment),
          name: 'futRel',
          pullRequests: [
            {
              author: { login: 'foobar-user-login', url: 'foobar-user-url' },
              mergedAt: moment('2018-10-23T10').toISOString(),
              number: 'foobar-number',
              title: 'foobar-title',
              updatedAt: moment('2018-10-23T10').toISOString(),
              url: 'foobar-url'
            }
          ],
          url: 'https://github.com/biz/buz/releases/tag/futRel'
        }
      ]);
    });

    it('should stop iterating when a pull request has an updated at that is before the start timestamp', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        futureRelease: 'futRel',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });
      const startDate = moment('2018-10-23T08');

      nock('https://api.github.com')
        .post('/graphql')
        .times(1)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      jest.spyOn(fetcher, 'getLatestRelease').mockReturnValue({ tagCommit: { committedDate: startDate } });
      jest.spyOn(startDate, 'isAfter');
      jest.spyOn(startDate, 'isBefore');

      const releases = await fetcher.fetchLatestChangelog();

      expect(releases[0].pullRequests).toHaveLength(2);
      expect(startDate.isAfter).toHaveBeenCalledTimes(1);
      expect(startDate.isAfter).toHaveReturnedWith(true);
      expect(startDate.isBefore).toHaveBeenCalledTimes(3);
      expect(startDate.isBefore).toHaveNthReturnedWith(1, true);
      expect(startDate.isBefore).toHaveNthReturnedWith(2, true);
      expect(startDate.isBefore).toHaveNthReturnedWith(3, false);
    });

    it('should stop iterating when no more pull requests exist', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        futureRelease: 'futRel',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });
      const startDate = moment('2018-10-10T08');

      nock('https://api.github.com')
        .post('/graphql')
        .times(1)
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      jest.spyOn(fetcher, 'getLatestRelease').mockReturnValue({ tagCommit: { committedDate: startDate } });
      jest.spyOn(startDate, 'isAfter');
      jest.spyOn(startDate, 'isBefore');

      const releases = await fetcher.fetchLatestChangelog();

      expect(releases[0].pullRequests).toHaveLength(5);
      expect(startDate.isAfter).not.toHaveBeenCalled();
      expect(startDate.isBefore).toHaveBeenCalledTimes(5);
      expect(startDate.isBefore).toHaveNthReturnedWith(1, true);
      expect(startDate.isBefore).toHaveNthReturnedWith(2, true);
      expect(startDate.isBefore).toHaveNthReturnedWith(3, true);
      expect(startDate.isBefore).toHaveNthReturnedWith(4, true);
      expect(startDate.isBefore).toHaveNthReturnedWith(5, true);
    });
  });

  describe('getLatestRelease()', () => {
    it('should return the latest release', async () => {
      const fetcher = new ChangelogFetcher({
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const result = await fetcher.getLatestRelease();

      expect(result).toEqual({
        name: 'latest-release',
        tagCommit: {
          committedDate: moment.utc(moment('2018-10-22T12').toISOString())
        },
        tagName: 'latest-release',
        url: 'latest-release-url'
      });
    });

    it('should return a mocked latest release if the repository has no releases', async () => {
      const fetcher = new ChangelogFetcher({
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, (_, requestBody) => {
          const mockData = getDataForRequest(requestBody);

          mockData.data.repository.latestRelease = undefined;

          return mockData;
        });

      const result = await fetcher.getLatestRelease();

      expect(result).toEqual({
        tagCommit: {
          committedDate: moment.utc(moment('2017-10-22T12').toISOString())
        }
      });
    });
  });

  describe('getLatestReleaseByTagPrefix()', () => {
    it('should return the latest release that starts with the given prefix', async () => {
      const fetcher = new ChangelogFetcher({
        owner: 'biz',
        releaseTagPrefix: 'foobar-',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const result = await fetcher.getLatestReleaseByTagPrefix();

      expect(result).toEqual({
        name: 'foobar-name',
        tagCommit: {
          committedDate: moment.utc(moment('2018-10-23T12').toISOString())
        },
        tagName: 'foobar-name',
        url: 'foobar-url'
      });
    });

    it('should return a mocked latest release if the repository has no releases', async () => {
      const fetcher = new ChangelogFetcher({
        owner: 'biz',
        releaseTagPrefix: 'foobar-',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, (_, requestBody) => {
          const mockData = getDataForRequest(requestBody);

          mockData.data.repository.releases.nodes = [];

          return mockData;
        });

      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const result = await fetcher.getLatestReleaseByTagPrefix();

      expect(result).toEqual({
        tagCommit: {
          committedDate: moment.utc(moment('2018-10-20T12').toISOString())
        }
      });
    });
  });

  describe('getRepositoryCreatedAt()', () => {
    it('should return the date the repository was created', async () => {
      const fetcher = new ChangelogFetcher({
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, (_, requestBody) => getDataForRequest(requestBody));

      const result = await fetcher.getRepositoryCreatedAt();

      expect(result).toEqual(moment.utc(moment('2018-10-20T12').toISOString()));
    });
  });
});
