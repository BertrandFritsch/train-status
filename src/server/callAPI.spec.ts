import { delay } from 'redux-saga';
import { apply, call, race } from 'redux-saga/effects';
import callAPI, { callAPI_, CallAPIResultType } from './callAPI';

describe('callAPI', () => {
  const URI = 'https://server.com/api';

  const RETRY_DELAYS = [ 1000, 3000 ];
  const CALL_TIMEOUT = 15000;

  const defaultCallAPIOptions = {
    headers: {
      Accept: 'application/json'
    },
    method: 'GET'
  };

  describe('callAPI_', () => {

    it('should use the provided arguments', () => {
      const URL = 'https://server.com/api/profile';
      const options = {
        method: 'POST',
        body: {}
      };

      const gen = callAPI_(URL, options);

      // call the API
      expect(gen.next().value).toEqual(call(fetch, URL, { ...defaultCallAPIOptions, ...options }));

      const response = {
        status: 200,
        json: () => { }
      };

      // get the JSON response
      expect(gen.next(response).value).toEqual(apply(response, response.json));

      const body = {};

      // get the body
      expect(gen.next(body)).toEqual({ done: true, value: { type: CallAPIResultType.SUCCESS, body: {}, status: 200 } });
    });

    it('should use the default options', () => {
      const URL = 'https://server.com/api/profile';

      const gen = callAPI_(URL);

      // call the API
      expect(gen.next().value).toEqual(call(fetch, URL, defaultCallAPIOptions));

      const response = {
        status: 200,
        json: () => { }
      };

      // get the JSON response
      expect(gen.next(response).value).toEqual(apply(response, response.json));

      const body = {};

      // get the body
      expect(gen.next(body)).toEqual({ done: true, value: { type: CallAPIResultType.SUCCESS, body: {}, status: 200 } });
    });

    it('should get a 0 status in case of an exception during the API call', () => {
      const gen = callAPI_(URI);

      // call the API
      expect(gen.next().value).toEqual(call(fetch, URI, defaultCallAPIOptions));

      const error = new Error('fetch exception...');

      // get the JSON response
      expect(gen.throw && gen.throw(error)).toEqual({ done: true, value: { type: CallAPIResultType.ERROR, error } });
    });
  });

  it('should send a request with the default options', () => {
    const URL = 'https://server.com/api/profile';

    const gen = callAPI(URL);

    // call the API
    expect(gen.next().value).toEqual(race({
      response: call(callAPI_, URL, defaultCallAPIOptions),
      timeout: call(delay, CALL_TIMEOUT)
    }));

    // get the response
    expect(gen.next({ response: { type: CallAPIResultType.SUCCESS, status: 200, body: 'data' } })).toEqual({
      done: true,
      value: { type: CallAPIResultType.SUCCESS, status: 200, body: 'data' }
    });
  });

  it('should retry if the API call times out', () => {
    const URL = 'https://server.com/api/profile';

    const gen = callAPI(URL);

    // call the API
    expect(gen.next().value).toEqual(race({
      response: call(callAPI_, URL, defaultCallAPIOptions),
      timeout: call(delay, CALL_TIMEOUT)
    }));

    // make timeout occur, should delay one time
    expect(gen.next({ timeout: true }).value).toEqual(call(delay, RETRY_DELAYS[ 0 ]));

    // call the API a second time
    expect(gen.next().value).toEqual(race({
      response: call(callAPI_, URL, defaultCallAPIOptions),
      timeout: call(delay, CALL_TIMEOUT)
    }));

    // now, get the response
    expect(gen.next({ response: { type: CallAPIResultType.SUCCESS, status: 200, body: 'data' } })).toEqual({
      done: true,
      value: { type: CallAPIResultType.SUCCESS, status: 200, body: 'data' }
    });
  });

  it('should fail if the API call times out three times', () => {
    const URL = 'https://server.com/api/profile';

    const gen = callAPI(URL);

    // call the API
    expect(gen.next().value).toEqual(race({
      response: call(callAPI_, URL, defaultCallAPIOptions),
      timeout: call(delay, CALL_TIMEOUT)
    }));

    // make timeout occur, should delay one time
    expect(gen.next({ timeout: true }).value).toEqual(call(delay, RETRY_DELAYS[ 0 ]));

    // call the API a second time
    expect(gen.next().value).toEqual(race({
      response: call(callAPI_, URL, defaultCallAPIOptions),
      timeout: call(delay, CALL_TIMEOUT)
    }));

    // make timeout occur, should delay a second time
    expect(gen.next({ timeout: true }).value).toEqual(call(delay, RETRY_DELAYS[ 1 ]));

    // call the API a third time
    expect(gen.next().value).toEqual(race({
      response: call(callAPI_, URL, defaultCallAPIOptions),
      timeout: call(delay, CALL_TIMEOUT)
    }));

    // should return an error
    expect(gen.next({ timeout: true })).toEqual({
      done: true,
      value: { type: CallAPIResultType.ERROR, error: new Error('The API call timed out.') }
    });
  });

  it('should get 500 if the API call gets 500 three times ', () => {
    const URL = 'https://server.com/api/profile';

    const gen = callAPI(URL);

    // call the API
    expect(gen.next().value).toEqual(race({
      response: call(callAPI_, URL, defaultCallAPIOptions),
      timeout: call(delay, CALL_TIMEOUT)
    }));

    const response = {
      type: CallAPIResultType.SUCCESS,
      status: 500,
      body: undefined
    };

    // make timeout occur, should delay one time
    expect(gen.next({ response }).value).toEqual(call(delay, RETRY_DELAYS[ 0 ]));

    // call the API a second time
    expect(gen.next().value).toEqual(race({
      response: call(callAPI_, URL, defaultCallAPIOptions),
      timeout: call(delay, CALL_TIMEOUT)
    }));

    // make timeout occur, should delay a second time
    expect(gen.next({ response }).value).toEqual(call(delay, RETRY_DELAYS[ 1 ]));

    // call the API a third time
    expect(gen.next().value).toEqual(race({
      response: call(callAPI_, URL, defaultCallAPIOptions),
      timeout: call(delay, CALL_TIMEOUT)
    }));

    // should return an error
    expect(gen.next({ response })).toEqual({ done: true, value: response });
  });
});
