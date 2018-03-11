import { applyMiddleware, combineReducers, compose, createStore, Store as ReduxStore } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { StatusState } from './contexts/status';
import statusReducers from './contexts/status/_module_/reducers';
import statusSagas from './contexts/status/_module_/sagas';

const nodeProcess = typeof process !== 'undefined' && process;
const isTestEnv = nodeProcess && nodeProcess.env.NODE_ENV === 'test';

const sagaMiddleware = createSagaMiddleware();

/**
 * redux middleware -- only the saga middleware used here
 */
const middleware = [sagaMiddleware];

/**
 * Wrap the createStore function to be able to use the REDUX DEVTOOLS in development mode
 */
const enhancedWindow = typeof window === 'undefined' ? {} : window as any;
const composeEnhancers = enhancedWindow.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const finalCreateStore = !isTestEnv ? composeEnhancers(
  applyMiddleware(...middleware)
)(createStore) : createStore;

/**
 * Create the redux store
 */
export type Store = ReduxStore<StatusState>;
const store: Store = finalCreateStore(combineReducers({ ...statusReducers }));

/**
 * Start the sagas
 */
if (!isTestEnv) {
  sagaMiddleware.run(statusSagas);
}

export default store;
