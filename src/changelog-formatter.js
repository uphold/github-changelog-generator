'use strict';

/**
 * Export `formatChangelog`.
 */

module.exports.formatChangelog = releases => {
  const changelog = ['# Changelog\n'];

  for (const release of releases) {
    changelog.push(
      `\n## [${release.name || release.tag_name}](${release.html_url}) (${release.created_at.format('YYYY-MM-DD')})\n`
    );

    for (const pr of release.prs) {
      changelog.push(`- ${pr.title} [\\#${pr.number}](${pr.html_url}) ([${pr.user.login}](${pr.user.html_url}))\n`);
    }
  }

  return changelog;
};
