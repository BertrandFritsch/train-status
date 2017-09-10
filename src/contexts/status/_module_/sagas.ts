import {throttle, call, take, put, select, PutEffect, TakeEffect, SelectEffect, Func1} from 'redux-saga/effects';

import callAPI, {CallAPIResult, CallAPIResultType} from '../../../server/callAPI';
import ActionTypes, {StatusAction} from './actionTypes';
import {getSelectedStopPoint} from './selectors';
import {SelectedStopPoint, StatusState, PeriodType} from './reducers';
import {
  filterTripsOfStopPointByTimeSlot,
  filterStopPointByYear,
  filterStopPointByDate,
  filterStopPointByFrequency,
  filterStopPointByMonth,
  filterStopPointByWeek,
  groupTripsByHour
} from '../../../data';

// const line = { id: 'line:OIF:810:AOIF741', name: 'RER A' }; // RER A
const line = {id: 'line:OIF:800:LOIF742', name: 'Transilien L'}; // Ligne L
const suggestionLinesURI = (value: string) => `https://api.navitia.io/v1/coverage/fr-idf/pt_objects?q=${value}&type[]=line&count=100&depth=3`;
const lineURI = (id: string) => `https://api.navitia.io/v1/coverage/fr-idf/lines/${id}?depth=1`;
const stopPointsURI = (id: string) => `https://api.navitia.io/v1/coverage/fr-idf/lines/${id}/stop_points?count=100`;
const stopPointRoutesURI = (id: string) => `https://api.navitia.io/v1/coverage/fr-idf/stop_points/${id}/routes?depth=1&forbidden_uris[]=physical_mode:Bus`;
const authToken = '500e0590-34d8-45bc-8081-2da6fd3b7755';

const stopPoints: { id: string, name: string, coord: { lat: number, lon: number } }[] = require('../../../../data/stops.json');

const STOP_POINT_VRD = {
  id: 'stop_point:OIF:SP:8738288:800:L',
  name: 'Gare de Viroflay Rive Droite',
  coord: [ 48.805493, 2.16852 ]
};

// character-typed put function
const statusActionPut = (action: StatusAction): PutEffect<StatusAction> => put(action);
const statusActionTake = <StatusAction>(pattern: ActionTypes): TakeEffect => take(pattern);
const statusActionSelect = (selector: Func1<StatusState>): SelectEffect => select(selector);

interface SNCFLines {
  pt_objects: Array<{
    id: string
    name: string,
  }>
}

interface SNCFLineData {
  lines: Array<{
    color: string,
    geojson: {
      coordinates: Array<Array<[ number, number ]>>
    }
  }>
}

interface SNCFStopPoints {
  stop_points: Array<{
    id: string,
    name: string,
    coord: {
      lat: string,
      lon: string
    }
  }>
}

interface SNCFRoutes {
  routes: Array<{
    id: string,
    direction: {
      name: string
    }
  }>
}

function* fetchLines(action: { type: ActionTypes.SUGGESTION_LINES_REQUESTED, payload: string }) {

  // get the suggested lines
  const apiCall: CallAPIResult<SNCFLines> = yield call(callAPI, suggestionLinesURI(action.payload), {headers: {Authorization: authToken}});

  if (apiCall.type === CallAPIResultType.SUCCESS && apiCall.status === 200 && apiCall.body) {
    const data = apiCall.body.pt_objects.map(o => ({id: o.id, name: o.name}));
    yield statusActionPut({type: ActionTypes.SUGGESTION_LINES_LOADED, payload: data});
  }
  else {
    // the API call failed
    yield statusActionPut({
      type: ActionTypes.DATA_LOAD_FAILED,
      payload: apiCall.type === CallAPIResultType.SUCCESS ? new Error('The API call failed') : apiCall.error
    });
  }
}

function* loadLineData() {

  for (; ;) {

    const action = yield statusActionTake(ActionTypes.SUGGESTION_LINE_REQUESTED);
    yield statusActionPut({type: ActionTypes.LINE_DATA_RESET});

    // get the line data
    const apiCall: CallAPIResult<SNCFLineData> = yield call(callAPI, lineURI(action.payload.id), {headers: {Authorization: authToken}});

    if (apiCall.type === CallAPIResultType.SUCCESS && apiCall.status === 200 && apiCall.body) {
      const data = {
        color: apiCall.body.lines[ 0 ].color,
        coordinates: apiCall.body.lines[ 0 ].geojson.coordinates
      };
      yield statusActionPut({type: ActionTypes.LINE_DATA_LOADED, payload: data});
    }
    else {
      // the API call failed
      yield statusActionPut({
        type: ActionTypes.DATA_LOAD_FAILED,
        payload: apiCall.type === CallAPIResultType.SUCCESS ? new Error('The API call failed') : apiCall.error
      });
    }
  }
}

function* loadStopPoints() {

  for (; ;) {

    const action = yield statusActionTake(ActionTypes.SUGGESTION_LINE_REQUESTED);
    yield statusActionPut({type: ActionTypes.STOP_POINTS_RESET});

    // get the stop points
    const apiCall: CallAPIResult<SNCFStopPoints> = yield call(callAPI, stopPointsURI(action.payload.id), {headers: {Authorization: authToken}});

    if (apiCall.type === CallAPIResultType.SUCCESS && apiCall.status === 200 && apiCall.body) {
      const data = apiCall.body.stop_points.map(d => ({id: d.id, name: d.name, coord: [ +d.coord.lat, +d.coord.lon ]}));
      yield statusActionPut({type: ActionTypes.STOP_POINTS_LOADED, payload: data});
    }
    else {
      // the API call failed
      yield statusActionPut({
        type: ActionTypes.DATA_LOAD_FAILED,
        payload: apiCall.type === CallAPIResultType.SUCCESS ? new Error('The API call failed') : apiCall.error
      });
    }
  }
}

function* loadStopPointRoutes() {

  for (; ;) {

    const action = yield statusActionTake(ActionTypes.STOP_POINT_SELECTED);

    // get the stop points
    const apiCall: CallAPIResult<SNCFRoutes> = yield call(callAPI, stopPointRoutesURI(action.payload.id), {headers: {Authorization: authToken}});

    if (apiCall.type === CallAPIResultType.SUCCESS && apiCall.status === 200 && apiCall.body) {
      // const data = apiCall.body.routes.map(d => ({ id: d.id, name: d.direction.name, coords: d.geojson.coordinates.reduce((acc, d1) => [ ...acc, ...d1 ], []) }));
      const data = apiCall.body.routes.map(d => ({
        id: d.id,
        name: d.direction.name,
        stopPoints: stopPoints.map(sp => ({id: sp.id, name: sp.name, coord: [ sp.coord.lat, sp.coord.lon ]}))
      }));
      yield statusActionPut({type: ActionTypes.STOP_POINT_ROUTES_LOADED, payload: data});
    }
    else {
      // the API call failed
      yield statusActionPut({
        type: ActionTypes.DATA_LOAD_FAILED,
        payload: apiCall.type === CallAPIResultType.SUCCESS ? new Error('The API call failed') : apiCall.error
      });
    }
  }
}

function* updateTrainsFromTimeSlot() {
  const selectedStopPoint: SelectedStopPoint = yield statusActionSelect(getSelectedStopPoint);

  const trips = selectedStopPoint.stopPoint && selectedStopPoint.selectedRoute !== null && selectedStopPoint.timeSlot !== null ? groupTripsByHour((() => {
    const timeSlotTrips = filterTripsOfStopPointByTimeSlot(selectedStopPoint.stopPoint.id, selectedStopPoint.timeSlot[ 0 ], selectedStopPoint.timeSlot[ 1 ]);
    switch (selectedStopPoint.period.type) {
      case PeriodType.YEAR:
        return filterStopPointByYear(timeSlotTrips, selectedStopPoint.period.value as number);

      case PeriodType.MONTH:
        return filterStopPointByMonth(timeSlotTrips, selectedStopPoint.period.value as number);

      case PeriodType.WEEK:
        return filterStopPointByWeek(timeSlotTrips, new Date(selectedStopPoint.period.value as string));

      case PeriodType.DATE:
        return filterStopPointByDate(timeSlotTrips, selectedStopPoint.period.value as Date);

      case PeriodType.FREQUENCY:
        return filterStopPointByFrequency(timeSlotTrips, selectedStopPoint.period.value as number);

      default:
        return [];
    }
  })()) : [];
  yield statusActionPut({type: ActionTypes.TIMESLOT_TRAINS_UPDATED, payload: trips});
}

function* initStatus() {
  yield statusActionPut({type: ActionTypes.SUGGESTION_LINE_REQUESTED, payload: line});
  yield statusActionPut({type: ActionTypes.STOP_POINT_SELECTED, payload: STOP_POINT_VRD});
  const now = new Date();
  yield statusActionPut({type: ActionTypes.TIMESLOT_SELECTED, payload: [ new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 55), new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 5) ]});

  const routes = (yield statusActionTake(ActionTypes.STOP_POINT_ROUTES_LOADED)).payload;

  yield statusActionPut({type: ActionTypes.ROUTE_SELECTED, payload: routes[ 1 ]});
}

/**
 * status sagas
 */
export default function* () {
  yield [
    throttle(500, ActionTypes.SUGGESTION_LINES_REQUESTED, fetchLines),
    throttle(500, [ ActionTypes.PERIOD_SELECTED, ActionTypes.ROUTE_SELECTED, ActionTypes.TIMESLOT_SELECTED ], updateTrainsFromTimeSlot),
    call(loadLineData),
    call(loadStopPoints),
    call(loadStopPointRoutes) //,
    // call(initStatus)
  ];
}
