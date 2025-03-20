/**
 * Module dependencies.
 */

import { formatChangelog } from '../src/changelog-formatter.js';
import moment from 'moment';

/**
 * Test `ChangelogFormatter`.
 */

describe('ChangelogFormatter', () => {
  describe('formatChangelog()', () => {
    it('should return an array of lines for releases and pull requests in the expected format', () => {
      const releases = [
        {
          createdAt: moment('2018-10-23'),
          name: 'foo-name',
          pullRequests: [
            {
              author: { login: 'foobar-user-login', url: 'foobar-user-url' },
              number: 'foobar-number',
              title: 'foobar-title',
              url: 'foobar-url'
            },
            {
              author: { login: 'foobiz-user-login', url: 'foobiz-user-url' },
              number: 'foobiz-number',
              title: 'foobiz-title',
              url: 'foobiz-url'
            }
          ],
          tagName: 'foo-tag',
          url: 'foo-url'
        },
        {
          createdAt: moment('2018-10-22'),
          pullRequests: [
            {
              author: { login: 'barbiz-user-login', url: 'barbiz-user-url' },
              number: 'barbiz-number',
              title: 'barbiz-title',
              url: 'barbiz-url'
            },
            {
              author: { login: 'barbuz-user-login', url: 'barbuz-user-url' },
              number: 'barbuz-number',
              title: 'barbuz-title',
              url: 'barbuz-url'
            }
          ],
          tagName: 'bar-tag',
          url: 'bar-url'
        }
      ];

      expect(formatChangelog(releases)).toEqual([
        '# Changelog\n',
        '\n## [foo-name](foo-url) (2018-10-23)\n',
        '- foobar-title [\\#foobar-number](foobar-url) ([foobar-user-login](foobar-user-url))\n',
        '- foobiz-title [\\#foobiz-number](foobiz-url) ([foobiz-user-login](foobiz-user-url))\n',
        '\n## [bar-tag](bar-url) (2018-10-22)\n',
        '- barbiz-title [\\#barbiz-number](barbiz-url) ([barbiz-user-login](barbiz-user-url))\n',
        '- barbuz-title [\\#barbuz-number](barbuz-url) ([barbuz-user-login](barbuz-user-url))\n'
      ]);
    });
  });
});
