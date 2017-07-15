/**
 * All redux actions are events
 */

import { LineData, StopPoints } from './reducers';

const enum ActionTypes {
  DATA_LOADING = 'DATA_LOADING',
  LINE_DATA_LOADED = 'LINE_DATA_LOADED',
  STOP_POINTS_LOADED = 'STOP_POINTS_LOADED',
  DATA_LOAD_FAILED = 'DATA_LOAD_FAILED'
}

export default ActionTypes;

export type StatusAction =
    { type: ActionTypes.DATA_LOADING }
  | { type: ActionTypes.LINE_DATA_LOADED, payload: LineData }
  | { type: ActionTypes.STOP_POINTS_LOADED, payload: StopPoints }
  | { type: ActionTypes.DATA_LOAD_FAILED, payload: Error };

export interface Dispatch<S> {
  (action: StatusAction): void;
}
