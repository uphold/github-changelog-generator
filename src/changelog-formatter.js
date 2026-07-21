'use strict';

/**
 * Formats the changelog based on the provided releases.
 * - The output is a markdown formatted changelog, which includes:
 *  - Release name and URL.
 *  - Pull request titles and authors.
 *
 * @param {ChangelogGenerator.Release[]} releases - List of releases to format.
 * @returns {string[]} Formatted changelog.
 */
function formatChangelog(releases) {
  const changelog = ['# Changelog\n'];

  for (const release of releases) {
    const releaseTitle = release.name || release.tagName;

    changelog.push(`\n## [${releaseTitle}](${release.url}) (${release.createdAt.format('YYYY-MM-DD')})\n\n`);

    for (const { author, number, title, url } of release.pullRequests) {
      changelog.push(`- ${title} [\\#${number}](${url}) ([${author.login}](${author.url}))\n`);
    }
  }

  return changelog;
}

/**
 * Export `formatChangelog`.
 */

export { formatChangelog };
