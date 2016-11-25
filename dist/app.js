'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/**
 * Get results from the next pages.
 */

var getResultsFromNextPages = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(results, fn) {
    var lastPage, pages;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            lastPage = 1;


            if (has(results, 'meta.link')) {
              lastPage = results.meta.link.match(/<[^>]+[&?]page=([0-9]+)[^>]+>; rel="last"/)[1];
            }

            pages = range(2, lastPage + 1);
            _context.t0 = results;
            _context.next = 6;
            return Promise.map(pages, fn, { concurrency: concurrency });

          case 6:
            _context.t1 = _context.sent;
            _context.t2 = flatten(_context.t1);
            return _context.abrupt('return', concat(_context.t0, _context.t2));

          case 9:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getResultsFromNextPages(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

/**
 * Get a page of releases.
 */

var getReleasesPage = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return github.repos.getReleases({ owner: owner, page: page, per_page: 100, repo: repo });

          case 2:
            return _context2.abrupt('return', _context2.sent);

          case 3:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getReleasesPage(_x3) {
    return _ref2.apply(this, arguments);
  };
}();

/**
 * Get all releases.
 */

var getAllReleases = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
    var releases;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return getReleasesPage();

          case 2:
            releases = _context3.sent;


            if (futureRelease) {
              releases.unshift({
                created_at: moment().format(),
                html_url: 'https://github.com/uphold/backend/releases/tag/' + futureRelease,
                name: futureRelease
              });
            }

            _context3.next = 6;
            return getResultsFromNextPages(releases, getReleasesPage);

          case 6:
            _context3.t0 = _context3.sent;

            _context3.t1 = function (release) {
              return assign(release, { created_at: moment.utc(release.created_at), prs: [] });
            };

            _context3.t2 = function (release) {
              return release.created_at.unix();
            };

            return _context3.abrupt('return', chain(_context3.t0).map(_context3.t1).sortBy(_context3.t2).value());

          case 10:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getAllReleases() {
    return _ref3.apply(this, arguments);
  };
}();

/**
 * Get a page of PRs.
 */

var getPullRequestsPage = function () {
  var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
    var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return github.pullRequests.getAll({ owner: owner, page: page, per_page: 100, repo: repo, state: 'closed' });

          case 2:
            return _context4.abrupt('return', _context4.sent);

          case 3:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function getPullRequestsPage(_x5) {
    return _ref4.apply(this, arguments);
  };
}();

/**
 * Get all PRs.
 */

var getAllPullRequests = function () {
  var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
    var prs;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return getPullRequestsPage();

          case 2:
            prs = _context5.sent;
            _context5.next = 5;
            return getResultsFromNextPages(prs, getPullRequestsPage);

          case 5:
            _context5.t0 = _context5.sent;

            _context5.t1 = function (pr) {
              return assign(pr, { merged_at: moment.utc(pr.merged_at) });
            };

            _context5.t2 = function (pr) {
              return pr.merged_at.unix();
            };

            return _context5.abrupt('return', chain(_context5.t0).map(_context5.t1).sortBy(_context5.t2).value());

          case 9:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function getAllPullRequests() {
    return _ref5.apply(this, arguments);
  };
}();

/**
 * Generate and write the  formatted changelog.
 */

/**
 * Run the changelog generator.
 */

var run = function () {
  var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
    var _ref7, _ref8, releases, prs;

    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            _context6.next = 2;
            return Promise.all([getAllReleases(), getAllPullRequests()]);

          case 2:
            _ref7 = _context6.sent;
            _ref8 = _slicedToArray(_ref7, 2);
            releases = _ref8[0];
            prs = _ref8[1];


            prs.forEach(function (pr) {
              return assignPrToRelease(releases, pr);
            });

            writeChangelog(releases.reverse());

          case 8:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function run() {
    return _ref6.apply(this, arguments);
  };
}();

/**
 * Run.
 */

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * Module dependencies.
 */

var _require = require('lodash'),
    assign = _require.assign,
    chain = _require.chain,
    concat = _require.concat,
    has = _require.has,
    flatten = _require.flatten,
    find = _require.find,
    range = _require.range;

var GitHubApi = require('github');
var Promise = require('bluebird');
var moment = require('moment');

/**
 * Options.
 */

var concurrency = 20;
var futureRelease = process.env.FUTURE_RELEASE;
var token = process.env.GITHUB_TOKEN;
var owner = process.env.OWNER;
var repo = process.env.REPO;

/**
 * Set up Github API connection.
 */

var github = new GitHubApi({ Promise: Promise });

github.authenticate({ token: token, type: 'token' });

/**
 * Assign a PR to a release.
 */

function assignPrToRelease(releases, pr) {
  var release = find(releases, function (release) {
    return pr.merged_at.isSameOrBefore(release.created_at);
  });

  if (release) {
    release.prs.unshift(pr);
  }
}function writeChangelog(releases) {
  var changelog = ['# Changelog\n'];

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = releases[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var release = _step.value;

      changelog.push('\n## [' + release.name + '](' + release.html_url + ') (' + release.created_at.format('YYYY-MM-DD') + ')\n');

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = release.prs[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var pr = _step2.value;

          changelog.push('- ' + pr.title + ' [' + pr.number + '](' + pr.html_url + ') ([' + pr.user.login + '](' + pr.user.html_url + '))\n');
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  changelog.forEach(function (line) {
    return process.stdout.write(line);
  });
}run();