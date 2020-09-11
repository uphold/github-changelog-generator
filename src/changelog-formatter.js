'use strict';

/**
 * Export `formatChangelog`.
 */

module.exports.formatChangelog = releases => {
  const changelog = ['# Changelog\n'];

  for (const release of releases) {
    changelog.push(
      `\n## [${release.name || release.tagName}](${release.url}) (${release.createdAt.format('YYYY-MM-DD')})\n`
    );

    for (const { author, number, title, url } of release.pullRequests) {
      changelog.push(`- ${title} [\\#${number}](${url}) ([${author.login}](${author.url}))\n`);
    }
  }

  return changelog;
};
