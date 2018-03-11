import * as React from 'react';
import { Provider } from 'react-redux';

import status from './contexts/status';

import { Store } from './createStore';

interface Props {
  store: Store;
}

// The UI structure
export default (props: Props) => (
  <Provider store={ props.store }>
    <status.components.StatusView />
  </Provider>
);
