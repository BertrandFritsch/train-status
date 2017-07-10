import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';

import './theme/theme.scss';

import App from './app';
import store from './createStore';

/**
 * Entry point of the Application
 */
ReactDOM.render(
  <AppContainer>
    <App store={ store }/>
  </AppContainer>, document.getElementById('root')
);

// Hot Module Replacement API
if (module.hot) {
  module.hot.accept('./app', () => {
    const App = require('./app').default;
    ReactDOM.render(
      <AppContainer>
        <App store={ store }/>
      </AppContainer>, document.getElementById('root')
    );
  });
}
