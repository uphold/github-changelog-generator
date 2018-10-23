
/**
 * Module dependencies.
 */

const { formatChangelog } = require('src/changelog-formatter');
const moment = require('moment');

/**
 * Test `ChangelogFormatter`.
 */

describe('ChangelogFormatter', () => {
  describe('formatChangelog()', () => {
    it('should return an array of lines for releases and pull requests in the expected format', () => {
      const releases = [{
        created_at: moment('2018-10-23'),
        name: 'foo-name',
        html_url: 'foo-url',
        prs: [{
          html_url: 'foobar-url',
          number: 'foobar-number',
          title: 'foobar-title',
          user: { html_url: 'foobar-user-url', login: 'foobar-user-login' }
        }, {
          html_url: 'foobiz-url',
          number: 'foobiz-number',
          title: 'foobiz-title',
          user: { html_url: 'foobiz-user-url', login: 'foobiz-user-login' }
        }],
        tag_name: 'foo-tag'
      }, {
        created_at: moment('2018-10-22'),
        html_url: 'bar-url',
        prs: [{
          html_url: 'barbiz-url',
          number: 'barbiz-number',
          title: 'barbiz-title',
          user: { html_url: 'barbiz-user-url', login: 'barbiz-user-login' }
        }, {
          html_url: 'barbuz-url',
          number: 'barbuz-number',
          title: 'barbuz-title',
          user: { html_url: 'barbuz-user-url', login: 'barbuz-user-login' }
        }],
        tag_name: 'bar-tag'
      }];

      expect(formatChangelog(releases)).toEqual([
        '# Changelog\n',
        '\n## [foo-name](foo-url) (2018-10-23)\n',
        '- foobar-title [\\#foobar-number](foobar-url) ([foobar-user-login](foobar-user-url))\n',
        '- foobiz-title [\\#foobiz-number](foobiz-url) ([foobiz-user-login](foobiz-user-url))\n',
        '\n## [bar-tag](bar-url) (2018-10-22)\n',
        '- barbiz-title [\\#barbiz-number](barbiz-url) ([barbiz-user-login](barbiz-user-url))\n',
        '- barbuz-title [\\#barbuz-number](barbuz-url) ([barbuz-user-login](barbuz-user-url))\n',
      ]);
    });
  });
});
