import { StatusAction } from './actionTypes';
import ActionTypes from './actionTypes';

export type LineData = {
  color: string,
  coordinates: Array<Array<[ number, number ]>>
};

export type StopPoints = Array<{
  name: string,
  coord: number[]
}>;

export type StatusData = {
  lineData: LineData,
  stopPoints: StopPoints
};

export interface State {
  data: StatusData
}

const initialState: State = {
  data: {
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

    case ActionTypes.LINE_DATA_LOADED:
      return { ...locState, data: { ...locState.data, lineData: action.payload } };

    case ActionTypes.STOP_POINTS_LOADED:
      return { ...locState, data: { ...locState.data, stopPoints: action.payload } };

    default:
      return locState;
  }
};

export default { status: reducer };
