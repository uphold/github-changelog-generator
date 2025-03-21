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
        },
        {
          createdAt: moment('2018-10-21'),
          pullRequests: [
            {
              author: { login: 'foobuz-user-login', url: 'foobuz-user-url' },
              number: 'foobuz-number',
              title: 'foobuz-title',
              url: 'foobuz-url'
            },
            {
              author: { login: 'foobaz-user-login', url: 'foobaz-user-url' },
              number: 'foobaz-number',
              title: 'foobaz-title',
              url: 'foobaz-url'
            }
          ],
          tagName: 'biz-tag',
          url: 'bar-url'
        },
        {
          createdAt: moment('2018-10-20'),
          name: 'qux-name',
          pullRequests: [
            {
              author: { login: 'fooqux-user-login', url: 'fooqux-user-url' },
              number: 'fooqux-number',
              title: 'fooqux-title',
              url: 'fooqux-url'
            }
          ],
          url: 'bar-url'
        }
      ];

      expect(formatChangelog(releases)).toEqual([
        '# Changelog\n',
        '\n## [foo-name](foo-url) (2018-10-23)\n\n',
        '- foobar-title [\\#foobar-number](foobar-url) ([foobar-user-login](foobar-user-url))\n',
        '- foobiz-title [\\#foobiz-number](foobiz-url) ([foobiz-user-login](foobiz-user-url))\n',
        '\n## [bar-tag](bar-url) (2018-10-22)\n\n',
        '- barbiz-title [\\#barbiz-number](barbiz-url) ([barbiz-user-login](barbiz-user-url))\n',
        '- barbuz-title [\\#barbuz-number](barbuz-url) ([barbuz-user-login](barbuz-user-url))\n',
        '\n## [biz-tag](bar-url) (2018-10-21)\n\n',
        '- foobuz-title [\\#foobuz-number](foobuz-url) ([foobuz-user-login](foobuz-user-url))\n',
        '- foobaz-title [\\#foobaz-number](foobaz-url) ([foobaz-user-login](foobaz-user-url))\n',
        '\n## [qux-name](bar-url) (2018-10-20)\n\n',
        '- fooqux-title [\\#fooqux-number](fooqux-url) ([fooqux-user-login](fooqux-user-url))\n'
      ]);
    });
  });
});
