'use strict';

/**
 * Export `formatChangelog`.
 */

export const formatChangelog = releases => {
  const changelog = ['# Changelog\n'];

  for (const release of releases) {
    const releaseNumber = release.tagName || release.name;

    changelog.push(`\n## [${releaseNumber}](${release.url}) (${release.createdAt.format('YYYY-MM-DD')})\n\n`);

    for (const { author, number, title, url } of release.pullRequests) {
      changelog.push(`- ${title} [\\#${number}](${url}) ([${author.login}](${author.url}))\n`);
    }
  }

  return changelog;
};
