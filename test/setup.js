/**
 * Module dependencies.
 */

import nock from 'nock';

/**
 * Disable any type of net connection.
 */

nock.disableNetConnect();

/**
 * Check all external mocks have been called.
 */

afterEach(() => {
  const pendingMocks = nock.pendingMocks();

  if (pendingMocks.length) {
    nock.cleanAll();

    throw new Error(`Unexpected pending mocks ${JSON.stringify(pendingMocks)}`);
  }
});
