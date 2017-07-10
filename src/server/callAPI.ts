import { delay } from 'redux-saga';
import { apply, call, race } from 'redux-saga/effects';
import 'whatwg-fetch';

// number of times the API call will be retried in case of failure and delays between each call
const RETRY_DELAYS = [ 1000, 3000 ];

// timeout for an API call
const CALL_TIMEOUT = 15000;

const defaultCallAPIOptions = {
  headers: {
    Accept: 'application/json'
  },
  method: 'GET'
};

/**
 * Whether the network call succeeded or failed
 */
export const enum CallAPIResultType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type CallAPIResult<T> =
  { type: CallAPIResultType.SUCCESS, status: number, body: T | undefined }
  | { type: CallAPIResultType.ERROR, error: Error };

/**
 * Internal function to call the API one time
 * @param {string} url
 * @param {object} opts
 * @returns {*} A saga effect
 *
 * @private
 */
export function* callAPI_<T>(url: string, opts: RequestInit = defaultCallAPIOptions) {
  try {
    const response: Response = yield call(fetch, url, {
      ...defaultCallAPIOptions,
      ...opts
    });

    // assume the response is JSON-formatted
    const body: T = yield apply(response, response.json);
    return {
      type: CallAPIResultType.SUCCESS,
      status: response.status,
      body
    };
  }
  catch (error) {
    return {
      type: CallAPIResultType.ERROR,
      error: error as Error
    };
  }
}

/**
 * Calls a remote API - should be called by a saga
 *
 * @param {string} url
 * @param {object} opts
 * @returns {CallAPIResult} A API result
 */
export default function* callAPI<T>(url: string, opts: RequestInit = defaultCallAPIOptions) {

  for (let retry = 0; retry <= RETRY_DELAYS.length; ++retry) {

    const { response }: { response: CallAPIResult<T> | undefined } = yield race({
      response: call(callAPI_, url, opts),
      timeout: call(delay, CALL_TIMEOUT)
    });

    if (response !== undefined && response.type === CallAPIResultType.SUCCESS && response.status < 500) {
      return response;
    }

    if (retry < RETRY_DELAYS.length) {
      yield call(delay, RETRY_DELAYS[ retry ]);
    }
    else if (response !== undefined) {
      // Return the response, whatever it is --  it's up to the caller to deal with the possible HTTP error codes
      return response;
    }
    else {
      // timeout
      return {
        type: CallAPIResultType.ERROR,
        error: new Error('The API call timed out.')
      };
    }
  }

  throw new Error('Should never reach this line!');
}
