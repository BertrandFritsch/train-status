import ActionTypes, { LoginAction } from './actionTypes';

export interface LoginCredentials {
  username: string | null,
  password: string | null
}

export interface State {
  loggedIn: boolean,
  username: string | null
}

const initialState: State = {
  loggedIn: false,
  username: null
};

const reducer = (state: State | undefined, action: LoginAction): State => {
  const locState = state || initialState;

  switch (action.type) {

    default:
      return locState;
  }
};

export default { status: reducer };
