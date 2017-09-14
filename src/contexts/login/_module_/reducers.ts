import ActionTypes, { LoginAction } from './actionTypes';

export interface LoginCredentials {
  username: string | null,
  password?: string | null
}

export interface State {
  loggedIn: boolean,
  username: string | null
}

const initialState: State = {
  loggedIn: true,
  username: null
};

export type LoginState = { login: State }

const reducer = (state: State | undefined, action: LoginAction): State => {
  const locState = state || initialState;

  switch (action.type) {

    case ActionTypes.LOGIN_VALIDATED:
      return { ...locState, username: action.payload.username, loggedIn: true };

    default:
      return locState;
  }
};

export default { login: reducer };
