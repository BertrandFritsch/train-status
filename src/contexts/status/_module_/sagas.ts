import { throttle, call, take, put, PutEffect, TakeEffect } from 'redux-saga/effects';

import callAPI, { CallAPIResult, CallAPIResultType } from '../../../server/callAPI';
import ActionTypes, { StatusAction } from './actionTypes';

// const line = { id: 'line:OIF:810:AOIF741', name: 'RER A' }; // RER A
const line = { id: 'line:OIF:800:LOIF742', name: 'Transilien L' }; // Ligne L
const suggestionLinesURI = (value: string) => `https://api.navitia.io/v1/coverage/fr-idf/pt_objects?q=${value}&type[]=line&count=100&depth=3`;
const lineURI = (id: string) => `https://api.navitia.io/v1/coverage/fr-idf/lines/${id}?depth=1`;
const stopPointsURI = (id: string) => `https://api.navitia.io/v1/coverage/fr-idf/lines/${id}/stop_points?count=100`;
const stopPointRoutesURI = (id: string) => `https://api.navitia.io/v1/coverage/fr-idf/stop_points/${id}/routes?depth=1&forbidden_uris[]=physical_mode:Bus`;
const authToken = '500e0590-34d8-45bc-8081-2da6fd3b7755';

// character-typed put function
const statusActionPut = (action: StatusAction): PutEffect<StatusAction> => put(action);
const statusActionTake = <StatusAction>(pattern: ActionTypes): TakeEffect => take(pattern);

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
    },
    geojson: {
      coordinates: number[][][]
    }
  }>
}

function* fetchLines(action: { type: ActionTypes.SUGGESTION_LINES_REQUESTED, payload: string }) {

  // get the suggested lines
  const apiCall: CallAPIResult<SNCFLines> = yield call(callAPI, suggestionLinesURI(action.payload), { headers: { Authorization: authToken } });

  if (apiCall.type === CallAPIResultType.SUCCESS && apiCall.status === 200 && apiCall.body) {
    const data = apiCall.body.pt_objects.map(o => ({ id: o.id, name: o.name }));
    yield statusActionPut({ type: ActionTypes.SUGGESTION_LINES_LOADED, payload: data });
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

  for (;;) {

    const action = yield statusActionTake(ActionTypes.SUGGESTION_LINE_REQUESTED);
    yield statusActionPut({ type: ActionTypes.LINE_DATA_RESET });

    // get the line data
    const apiCall: CallAPIResult<SNCFLineData> = yield call(callAPI, lineURI(action.payload.id), { headers: { Authorization: authToken } });

    if (apiCall.type === CallAPIResultType.SUCCESS && apiCall.status === 200 && apiCall.body) {
      const data = {
        color: apiCall.body.lines[ 0 ].color,
        coordinates: apiCall.body.lines[ 0 ].geojson.coordinates
      };
      yield statusActionPut({ type: ActionTypes.LINE_DATA_LOADED, payload: data });
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

  for (;;) {

    const action = yield statusActionTake(ActionTypes.SUGGESTION_LINE_REQUESTED);
    yield statusActionPut({ type: ActionTypes.STOP_POINTS_RESET });

    // get the stop points
    const apiCall: CallAPIResult<SNCFStopPoints> = yield call(callAPI, stopPointsURI(action.payload.id), { headers: { Authorization: authToken } });

    if (apiCall.type === CallAPIResultType.SUCCESS && apiCall.status === 200 && apiCall.body) {
      const data = apiCall.body.stop_points.map(d => ({ id: d.id, name: d.name, coord: [ +d.coord.lat, +d.coord.lon ] }));
      yield statusActionPut({ type: ActionTypes.STOP_POINTS_LOADED, payload: data });
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

  for (;;) {

    const action = yield statusActionTake(ActionTypes.STOP_POINT_SELECTED);

    // get the stop points
    const apiCall: CallAPIResult<SNCFRoutes> = yield call(callAPI, stopPointRoutesURI(action.payload.id), { headers: { Authorization: authToken } });

    if (apiCall.type === CallAPIResultType.SUCCESS && apiCall.status === 200 && apiCall.body) {
      const data = apiCall.body.routes.map(d => ({ id: d.id, name: d.direction.name, coords: d.geojson.coordinates.reduce((acc, d1) => [ ...acc, ...d1 ], []) }));
      yield statusActionPut({ type: ActionTypes.STOP_POINT_ROUTES_LOADED, payload: data });
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

function* initStatus() {
  yield statusActionPut({ type: ActionTypes.SUGGESTION_LINE_REQUESTED, payload: line})
}

/**
 * status sagas
 */
export default function* () {
  yield [
    throttle(500, ActionTypes.SUGGESTION_LINES_REQUESTED, fetchLines),
    call(loadLineData),
    call(loadStopPoints) //,
    // call(initStatus)
  ];
}
