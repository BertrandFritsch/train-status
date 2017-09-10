/**
 * All redux actions are events
 */

import { SuggestionLines, LineData, StopPoints, Route, StopPoint, SuggestionLine, Period } from './reducers';

const enum ActionTypes {
  DATA_LOADING = 'DATA_LOADING',
  SUGGESTION_LINES_REQUESTED = 'SUGGESTION_LINES_REQUESTED',
  SUGGESTION_LINES_LOADED = 'SUGGESTION_LINES_LOADED',
  SUGGESTION_LINES_RESET = 'SUGGESTION_LINES_RESET',
  SUGGESTION_LINE_REQUESTED = 'SUGGESTION_LINE_REQUESTED',
  LINE_DATA_RESET = 'LINE_DATA_RESET',
  LINE_DATA_LOADED = 'LINE_DATA_LOADED',
  STOP_POINTS_RESET = 'STOP_POINTS_RESET',
  STOP_POINTS_LOADED = 'STOP_POINTS_LOADED',
  DATA_LOAD_FAILED = 'DATA_LOAD_FAILED',
  STOP_POINT_SELECTED = 'STOP_POINT_SELECTED',
  STOP_POINT_ROUTES_LOADED = 'STOP_POINT_ROUTES_LOADED',
  PERIOD_SELECTED = 'PERIOD_SELECTED'
}

export default ActionTypes;

export type StatusAction =
  { type: ActionTypes.DATA_LOADING }
  | { type: ActionTypes.SUGGESTION_LINES_REQUESTED, payload: string }
  | { type: ActionTypes.SUGGESTION_LINES_LOADED, payload: SuggestionLines }
  | { type: ActionTypes.SUGGESTION_LINES_RESET }
  | { type: ActionTypes.SUGGESTION_LINE_REQUESTED, payload: SuggestionLine }
  | { type: ActionTypes.LINE_DATA_RESET }
  | { type: ActionTypes.LINE_DATA_LOADED, payload: LineData }
  | { type: ActionTypes.STOP_POINTS_RESET }
  | { type: ActionTypes.STOP_POINTS_LOADED, payload: StopPoints }
  | { type: ActionTypes.DATA_LOAD_FAILED, payload: Error }
  | { type: ActionTypes.STOP_POINT_SELECTED, payload: StopPoint }
  | { type: ActionTypes.STOP_POINT_ROUTES_LOADED, payload: Route[] }
  | { type: ActionTypes.PERIOD_SELECTED, payload: Period };

export interface Dispatch<S> {
  (action: StatusAction): void;
}
