/**
 * Configuration options for the `ChangelogFetcher` class.
 */
export interface FetcherOptions {
  /** The base branch of the repository. Defaults to `master`. */
  base: string;

  /** Prefix for the changed files. Resolved from `.git/` */
  changedFilesPrefix?: string;

  /** Next release's version. */
  futureRelease?: string;

  /** Next release's tag, if it is not the same as the version. */
  futureReleaseTag?: string;

  /** Labels to filter pull request by. */
  labels?: string[];

  /** The owner of the repository. */
  owner: string;

  /** Release tag prefix to consider when resolving the latest release. */
  releaseTagPrefix?: string;

  /** The name of the repository. */
  repo: string;

  /** The GitHub token to use for authentication. */
  token: string;
}

/** Response for `getPullRequestQuery` */
export interface GetPullRequestQueryResponse extends PaginationHelper {
  pullRequests: PullRequest[];
}

/** Response for `getReleasesQuery` */
export interface GetReleasesQueryResponse extends PaginationHelper {
  releases: Release[];
}

/** Response for `getPullRequestQuery` */
export interface GetPullRequestQueryResponse extends PaginationHelper {
  pullRequests: PullRequest[];
}

/** Response for `getReleasesQuery` */
export interface GetReleasesQueryResponse extends PaginationHelper {
  releases: Release[];
}

/**
 * Pagination helper, to be extended by the `GetPullRequestQueryResponse` and `GetReleasesQueryResponse` interfaces.
 */
interface PaginationHelper {
  cursor: string;
  hasMoreResults: boolean;
}

/** Pull Request interface */
export interface PullRequest {
  author: PullRequestAuthor;
  mergedAt?: moment.Moment;
  number: string;
  title: string;
  updatedAt?: moment.Moment;
  url: string;
}

/** Pull Request author interface */
interface PullRequestAuthor {
  login: string;
  url: string;
}

/** Release interface */
export interface Release {
  createdAt?: moment.Moment;
  name?: string;
  pullRequests?: PullRequest[];
  tagCommit?: ReleaseTagCommit;
  tagName?: string;
  url?: string;
}

/** Release tag commit interface */
interface ReleaseTagCommit {
  committedDate: moment.Moment;
}
