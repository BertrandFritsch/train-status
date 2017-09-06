import { call, take, put, PutEffect, TakeEffect } from 'redux-saga/effects';
import { delay } from 'redux-saga';

import ActionTypes, { LoginAction } from './actionTypes';

// character-typed put function
const statusActionPut = (action: LoginAction): PutEffect<LoginAction> => put(action);
const statusActionTake = <StatusAction>(pattern: ActionTypes): TakeEffect => take(pattern);


function* loginRequested() {
  const creds = (yield statusActionTake(ActionTypes.LOGIN_REQUESTED)).payload;

  // simulate network request
  yield call(delay, 1000);

  yield statusActionPut({ type: ActionTypes.LOGIN_VALIDATED, payload: { username: creds.username }});
}

/**
 * status sagas
 */
export default function* () {
  yield [
    call(loginRequested)
  ];
}
