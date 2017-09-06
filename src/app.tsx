import * as React from 'react';
import { Provider } from 'react-redux';

import login from './contexts/login';
import status from './contexts/status';

import { Store } from './createStore';

interface Props {
  store: Store;
}

// The UI structure
export default (props: Props) => (
  <Provider store={ props.store }>
    <login.components.LoginView>
      <status.components.StatusView />
    </login.components.LoginView>
  </Provider>
);
