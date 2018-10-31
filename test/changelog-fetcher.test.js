
/**
 * Module dependencies.
 */

const ChangelogFetcher = require('src/changelog-fetcher');
const moment = require('moment');
const nock = require('nock');

/**
 * Test `ChangelogFetcher`.
 */

describe('ChangelogFetcher', () => {
  describe('constructor()', () => {
    it('should set all defined fields', () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        futureRelease: 'bar',
        futureReleaseTag: 'baz',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      expect(fetcher.base).toEqual('foo');
      expect(fetcher.futureRelease).toEqual('bar');
      expect(fetcher.futureReleaseTag).toEqual('baz');
      expect(fetcher.owner).toEqual('biz');
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

  describe('fetchChangelog()', () => {
    it('should return a list of releases with their corresponding pull requests', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .get('/repos/biz/buz/releases')
        .query({ page: 1, per_page: 100 })
        .reply(200, [{
          created_at: moment('2018-10-23T12'),
          name: 'foo-name',
          html_url: 'foo-url',
          tag_name: 'foo-tag'
        }, {
          created_at: moment('2018-10-22T12'),
          html_url: 'bar-url',
          tag_name: 'bar-tag'
        }]);

      nock('https://api.github.com')
        .get('/repos/biz/buz/pulls')
        .query({ base: 'foo', page: 1, per_page: 100, state: 'closed' })
        .reply(200, [{
          html_url: 'quxfoo-url',
          merged_at: moment('2018-10-24T10'),
          number: 'quxfoo-number',
          title: 'quxfoo-title',
          user: { html_url: 'quxfoo-user-url', login: 'quxfoo-user-login' }
        }, {
          html_url: 'foobar-url',
          merged_at: moment('2018-10-23T10'),
          number: 'foobar-number',
          title: 'foobar-title',
          user: { html_url: 'foobar-user-url', login: 'foobar-user-login' }
        }, {
          html_url: 'foobiz-url',
          merged_at: moment('2018-10-22T20'),
          number: 'foobiz-number',
          title: 'foobiz-title',
          user: { html_url: 'foobiz-user-url', login: 'foobiz-user-login' }
        }, {
          html_url: 'barbiz-url',
          merged_at: moment('2018-10-22T10'),
          number: 'barbiz-number',
          title: 'barbiz-title',
          user: { html_url: 'barbiz-user-url', login: 'barbiz-user-login' }
        }, {
          html_url: 'barbuz-url',
          merged_at: moment('2018-10-21T05'),
          number: 'barbuz-number',
          title: 'barbuz-title',
          user: { html_url: 'barbuz-user-url', login: 'barbuz-user-login' }
        }]);

      const releases = await fetcher.fetchChangelog();

      expect(releases).toEqual([{
        created_at: expect.any(moment),
        name: 'foo-name',
        html_url: 'foo-url',
        prs: [{
          html_url: 'foobar-url',
          merged_at: expect.any(moment),
          number: 'foobar-number',
          title: 'foobar-title',
          user: { html_url: 'foobar-user-url', login: 'foobar-user-login' }
        }, {
          html_url: 'foobiz-url',
          merged_at: expect.any(moment),
          number: 'foobiz-number',
          title: 'foobiz-title',
          user: { html_url: 'foobiz-user-url', login: 'foobiz-user-login' }
        }],
        tag_name: 'foo-tag'
      }, {
        created_at: expect.any(moment),
        html_url: 'bar-url',
        prs: [{
          html_url: 'barbiz-url',
          merged_at: expect.any(moment),
          number: 'barbiz-number',
          title: 'barbiz-title',
          user: { html_url: 'barbiz-user-url', login: 'barbiz-user-login' }
        }, {
          html_url: 'barbuz-url',
          merged_at: expect.any(moment),
          number: 'barbuz-number',
          title: 'barbuz-title',
          user: { html_url: 'barbuz-user-url', login: 'barbuz-user-login' }
        }],
        tag_name: 'bar-tag'
      }]);
    });

    it('should add a new release based on `futureRelease`', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        futureRelease: 'bar',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .get('/repos/biz/buz/releases')
        .query({ page: 1, per_page: 100 })
        .reply(200, [{
          created_at: moment('2018-10-23T12'),
          name: 'foo-name',
          html_url: 'foo-url',
          tag_name: 'foo-tag'
        }]);

      nock('https://api.github.com')
        .get('/repos/biz/buz/pulls')
        .query({ base: 'foo', page: 1, per_page: 100, state: 'closed' })
        .reply(200, [{
          html_url: 'foobar-url',
          merged_at: moment('2018-10-23T16'),
          number: 'foobar-number',
          title: 'foobar-title',
          user: { html_url: 'foobar-user-url', login: 'foobar-user-login' }
        }, {
          html_url: 'foobiz-url',
          merged_at: moment('2018-10-22T20'),
          number: 'foobiz-number',
          title: 'foobiz-title',
          user: { html_url: 'foobiz-user-url', login: 'foobiz-user-login' }
        }]);

      const releases = await fetcher.fetchChangelog();

      expect(releases).toEqual([{
        created_at: expect.any(moment),
        name: 'bar',
        html_url: 'https://github.com/biz/buz/releases/tag/bar',
        prs: [{
          html_url: 'foobar-url',
          merged_at: expect.any(moment),
          number: 'foobar-number',
          title: 'foobar-title',
          user: { html_url: 'foobar-user-url', login: 'foobar-user-login' }
        }]
      }, {
        created_at: expect.any(moment),
        name: 'foo-name',
        html_url: 'foo-url',
        prs: [{
          html_url: 'foobiz-url',
          merged_at: expect.any(moment),
          number: 'foobiz-number',
          title: 'foobiz-title',
          user: { html_url: 'foobiz-user-url', login: 'foobiz-user-login' }
        }],
        tag_name: 'foo-tag'
      }]);
    });

    it('should return a list of releases with their corresponding pull requests', async () => {
      const fetcher = new ChangelogFetcher({
        base: 'foo',
        owner: 'biz',
        repo: 'buz',
        token: 'qux'
      });

      nock('https://api.github.com')
        .get('/repos/biz/buz/releases')
        .query({ page: 1, per_page: 100 })
        .reply(200, [{
          created_at: moment('2018-10-23T12'),
          name: 'foo-name',
          html_url: 'foo-url',
          tag_name: 'foo-tag'
        }], {
          link: '<foo&page=2&per_page=100>; rel="last"'
        });

      nock('https://api.github.com')
        .get('/repos/biz/buz/releases')
        .query({ page: 2, per_page: 100 })
        .reply(200, [{
          created_at: moment('2018-10-22T12'),
          html_url: 'bar-url',
          tag_name: 'bar-tag'
        }], {
          link: '<foo&page=2&per_page=100>; rel="last"'
        });

      nock('https://api.github.com')
        .get('/repos/biz/buz/pulls')
        .query({ base: 'foo', page: 1, per_page: 100, state: 'closed' })
        .reply(200, [{
          html_url: 'foobar-url',
          merged_at: moment('2018-10-23T10'),
          number: 'foobar-number',
          title: 'foobar-title',
          user: { html_url: 'foobar-user-url', login: 'foobar-user-login' }
        }, {
          html_url: 'foobiz-url',
          merged_at: moment('2018-10-22T20'),
          number: 'foobiz-number',
          title: 'foobiz-title',
          user: { html_url: 'foobiz-user-url', login: 'foobiz-user-login' }
        }, {
          html_url: 'barbiz-url',
          merged_at: moment('2018-10-22T10'),
          number: 'barbiz-number',
          title: 'barbiz-title',
          user: { html_url: 'barbiz-user-url', login: 'barbiz-user-login' }
        }], {
          link: '<foo&page=2&per_page=100>; rel="last"'
        });

      nock('https://api.github.com')
        .get('/repos/biz/buz/pulls')
        .query({ base: 'foo', page: 2, per_page: 100, state: 'closed' })
        .reply(200, [{
          html_url: 'barbuz-url',
          merged_at: moment('2018-10-21T05'),
          number: 'barbuz-number',
          title: 'barbuz-title',
          user: { html_url: 'barbuz-user-url', login: 'barbuz-user-login' }
        }], {
          link: '<foo&page=2&per_page=100>; rel="last"'
        });

      const releases = await fetcher.fetchChangelog();

      expect(releases).toEqual([{
        created_at: expect.any(moment),
        name: 'foo-name',
        html_url: 'foo-url',
        prs: [{
          html_url: 'foobar-url',
          merged_at: expect.any(moment),
          number: 'foobar-number',
          title: 'foobar-title',
          user: { html_url: 'foobar-user-url', login: 'foobar-user-login' }
        }, {
          html_url: 'foobiz-url',
          merged_at: expect.any(moment),
          number: 'foobiz-number',
          title: 'foobiz-title',
          user: { html_url: 'foobiz-user-url', login: 'foobiz-user-login' }
        }],
        tag_name: 'foo-tag'
      }, {
        created_at: expect.any(moment),
        html_url: 'bar-url',
        prs: [{
          html_url: 'barbiz-url',
          merged_at: expect.any(moment),
          number: 'barbiz-number',
          title: 'barbiz-title',
          user: { html_url: 'barbiz-user-url', login: 'barbiz-user-login' }
        }, {
          html_url: 'barbuz-url',
          merged_at: expect.any(moment),
          number: 'barbuz-number',
          title: 'barbuz-title',
          user: { html_url: 'barbuz-user-url', login: 'barbuz-user-login' }
        }],
        tag_name: 'bar-tag'
      }]);
    });
  });
});
