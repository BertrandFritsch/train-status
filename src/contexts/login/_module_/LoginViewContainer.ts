import { connect } from 'react-redux';
import { LoginState, State, LoginCredentials } from './reducers';
import ActionTypes, { Dispatch } from './actionTypes';
import LoginView from './LoginView';

export default connect(
  <TOwnProps extends { children: React.ComponentClass }>(state: LoginState, ownProps: TOwnProps) => ({ ... state.login, backComponent: ownProps.children }),
  (dispatch: Dispatch<State>) => ({
    onLoginRequested: (creds: LoginCredentials): void => dispatch({ type: ActionTypes.LOGIN_REQUESTED, payload: creds })
  }),
  (stateProps, dispatchProps) => ({
    ...stateProps,
    ...dispatchProps
  }))(LoginView);
