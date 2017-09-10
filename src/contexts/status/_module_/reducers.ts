import { StatusAction } from './actionTypes';
import ActionTypes from './actionTypes';
import { TripStopPoint } from "../../../data";

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

export interface StopPoint {
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
  stopPoints: StopPoint[]
}

export type TimeSlot = [ Date, Date ];

export type TimeSlotTrain = TripStopPoint[];

export type TimeSlotTrains = {
  trains: TimeSlotTrain[];
  timePosition: Date;   // last fixed position
  timeRunning: boolean;
};

export interface SelectedStopPoint {
  stopPoint: StopPoint | null;
  period: Period;
  routes: Route[];
  selectedRoute: string | null;
  timeSlot: TimeSlot | null;
  timeSlotTrains: TimeSlotTrains | null;
  stopPointConnections: StopPointConnections;
}

export interface StopPointConnectionsItem {
  label: string,
  color: string,
  zoom: number,
  stops: {
    name: string,
    coord: {
      lat: number,
      lng: number
    }
    id: string,
  }[],
  coord: {
    lat: number,
    lng: number
  }
}

export type StopPointConnections = StopPointConnectionsItem[];

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
    stopPoint: null,
    period: {
      type: PeriodType.FREQUENCY,
      value: 1
    },
    routes: [],
    selectedRoute: null,
    timeSlot: null,
    timeSlotTrains: null,
    stopPointConnections: []
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

    case ActionTypes.TIMESLOT_SELECTED:
      return { ...locState, selectedStopPoint: { ...locState.selectedStopPoint, timeSlot: action.payload } };

    case ActionTypes.ROUTE_SELECTED:
      return { ...locState, selectedStopPoint: { ...locState.selectedStopPoint, selectedRoute: action.payload.id } };

    case ActionTypes.TIMESLOT_TRAINS_UPDATED:
      return {
        ...locState,
        selectedStopPoint: {
          ...locState.selectedStopPoint,
          timeSlotTrains: action.payload.length > 0 ? { trains: action.payload, timePosition: action.payload[ 0 ][ 0 ].date, timeRunning: false } : null
        }
      };

    case ActionTypes.TIME_RUNNING_TOGGLED: {
      return {
        ...locState,
        selectedStopPoint: {
          ...locState.selectedStopPoint,
          timeSlotTrains: locState.selectedStopPoint.timeSlotTrains !== null
            ? {
              ...locState.selectedStopPoint.timeSlotTrains,
              timePosition: action.payload !== null ? action.payload : locState.selectedStopPoint.timeSlotTrains.trains[ 0 ][ 0 ].date,
              timeRunning: action.payload !== null && !locState.selectedStopPoint.timeSlotTrains.timeRunning
            }
            : null
        }
      };
    }

    case ActionTypes.STOP_POINT_CONNECTION_LOADED:
      return { ...locState, selectedStopPoint: { ...locState.selectedStopPoint, stopPointConnections: action.payload } };

    default:
      return locState;
  }
};

export default { status: reducer };
