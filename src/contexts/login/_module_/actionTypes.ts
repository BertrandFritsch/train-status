/**
 * All redux actions are events
 */

import { LoginCredentials } from './reducers';

const enum ActionTypes {
  LOGIN_REQUESTED = 'LOGIN_REQUESTED',
  LOGIN_VALIDATED = 'LOGIN_VALIDATED'
}

export default ActionTypes;

export type LoginAction =
    { type: ActionTypes.LOGIN_REQUESTED, payload: LoginCredentials }
  | { type: ActionTypes.LOGIN_VALIDATED, payload: LoginCredentials };

export interface Dispatch<S> {
  (action: LoginAction): void;
}
