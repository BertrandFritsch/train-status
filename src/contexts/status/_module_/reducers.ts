import * as moment from 'moment';

import { StatusAction } from './actionTypes';
import ActionTypes from './actionTypes';

const STOP_POINT_VRD = {
  id: 'stop_point:OIF:SP:8738288:800:L',
  name: 'Gare de Viroflay Rive Droite',
  coord: [ 48.805493, 2.16852]
};

export const enum PeriodType {
  DATE = 'DATE',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
  FREQUENCY = 'FREQUENCY'
}

export interface Period {
  type: PeriodType,
  value: string | number | Date | null
}

export interface SuggestionLine {
  id: string,
  name: string
}

export type SuggestionLines = SuggestionLine[];

export interface LineData {
  color: string,
  coordinates: Array<Array<[ number, number ]>>
}

export type StopPoint = {
  id: string,
  name: string,
  coord: number[]
}

export type StopPoints = Array<StopPoint>;

export interface StatusData {
  lines: SuggestionLines,
  lineData: LineData,
  stopPoints: StopPoints
}

export interface Route {
  id: string,
  name: string,
  coords: number[][]
}

export interface SelectedStopPoint {
  stopPoint: StopPoint | null,
  period: Period,
  routes: Route[]
}

export interface State {
  data: StatusData,
  selectedStopPoint: SelectedStopPoint,
  error: Error | null
}

export type StatusState = { status: State }

const initialState: State = {
  data: {
    lines: [],
    lineData: {
      color: '000000',
      coordinates: []
    },
    stopPoints: []
  },
  selectedStopPoint: {
    stopPoint: null /*STOP_POINT_VRD*/,
    period: {
      type: PeriodType.YEAR,
      value: moment().year()
    },
    routes: []
  },
  error: null
};

const reducer = (state: State | undefined, action: StatusAction): State => {
  const locState = state || initialState;

  switch (action.type) {

    case ActionTypes.SUGGESTION_LINES_LOADED:
      return { ...locState, data: { ...locState.data, lines: action.payload } };

    case ActionTypes.SUGGESTION_LINES_RESET:
      return { ...locState, data: { ...locState.data, lines: [] } };

    case ActionTypes.LINE_DATA_RESET:
      return { ...locState, data: { ...locState.data, lineData: initialState.data.lineData } };

    case ActionTypes.LINE_DATA_LOADED:
      return { ...locState, data: { ...locState.data, lineData: action.payload } };

    case ActionTypes.STOP_POINTS_RESET:
      return { ...locState, data: { ...locState.data, stopPoints: initialState.data.stopPoints } };

    case ActionTypes.STOP_POINTS_LOADED:
      return { ...locState, data: { ...locState.data, stopPoints: action.payload } };

    case ActionTypes.DATA_LOAD_FAILED:
      return { ...locState, error: action.payload };

    case ActionTypes.STOP_POINT_SELECTED:
      return { ...locState, selectedStopPoint: { ...locState.selectedStopPoint, stopPoint: action.payload } };

    case ActionTypes.STOP_POINT_ROUTES_LOADED:
      return { ...locState, selectedStopPoint: { ...locState.selectedStopPoint, routes: action.payload } };

    case ActionTypes.PERIOD_SELECTED:
      return { ...locState, selectedStopPoint: { ...locState.selectedStopPoint, period: action.payload } };

    default:
      return locState;
  }
};

export default { status: reducer };
