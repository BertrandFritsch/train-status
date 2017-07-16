import { StatusAction } from './actionTypes';
import ActionTypes from './actionTypes';

export interface SuggestionLine {
  id: string,
  name: string
}

export type SuggestionLines = SuggestionLine[];

export interface LineData {
  color: string,
  coordinates: Array<Array<[ number, number ]>>
}

export type StopPoints = Array<{
  name: string,
  coord: number[]
}>;

export interface StatusData {
  lines: SuggestionLines,
  lineData: LineData,
  stopPoints: StopPoints
}

export interface State {
  data: StatusData
}

const initialState: State = {
  data: {
    lines: [],
    lineData: {
      color: '000000',
      coordinates: []
    },
    stopPoints: []
  }
};

const reducer = (state: State | undefined, action: StatusAction): State => {
  const locState = state || initialState;

  switch (action.type) {

    case ActionTypes.SUGGESTION_LINES_LOADED:
      return { ...locState, data: { ...locState.data, lines: action.payload } };

    case ActionTypes.SUGGESTION_LINES_RESET:
      return { ...locState, data: { ...locState.data, lines: [] } };

    case ActionTypes.LINE_DATA_LOADED:
      return { ...locState, data: { ...locState.data, lineData: action.payload } };

    case ActionTypes.STOP_POINTS_LOADED:
      return { ...locState, data: { ...locState.data, stopPoints: action.payload } };

    default:
      return locState;
  }
};

export default { status: reducer };
