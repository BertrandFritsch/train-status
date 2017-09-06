import LoginView from './_module_/LoginViewContainer';
import reducers, { State } from './_module_/reducers';
import sagas from './_module_/sagas';

export type LoginState = { login: State }

export default {

  // public interface of the status context
  components: {
    LoginView
  },

  // technical exports
  sagas,
  reducers: { status: reducers }
};
