import { call, put, PutEffect } from 'redux-saga/effects';

import callAPI, { CallAPIResult, CallAPIResultType } from '../../../server/callAPI';
import ActionTypes, { StatusAction } from './actionTypes';

const lineId = 'line:OIF:810:AOIF741';
const lineURI = `https://api.navitia.io/v1/coverage/fr-idf/lines/${lineId}`;
const stopPointsURI = `https://api.navitia.io/v1/coverage/fr-idf/lines/${lineId}/stop_points?count=100`;
const authToken = '500e0590-34d8-45bc-8081-2da6fd3b7755';

// character-typed put function
const statusActionPut = (action: StatusAction): PutEffect<StatusAction> => put(action);

interface SNCFLineData {
  lines: Array<{
    color: string,
    geojson: {
      coordinates: Array< Array<[ number, number ]> >
    }
  }>
}

interface SNCFStopPoints {
  stop_points: Array<{
    name: string,
    coord: {
      lat: string,
      lon: string
    }
  }>
}

function* loadLineData() {

  // get the line data
  const apiCall: CallAPIResult<SNCFLineData> = yield call(callAPI, lineURI, { headers: { Authorization: authToken } });

  if (apiCall.type === CallAPIResultType.SUCCESS && apiCall.status === 200 && apiCall.body) {
    const data = {
      color: apiCall.body.lines[0].color,
      coordinates: apiCall.body.lines[0].geojson.coordinates
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

function* loadStopPoints() {

  // get the stop points
  const apiCall: CallAPIResult<SNCFStopPoints> = yield call(callAPI, stopPointsURI, { headers: { Authorization: authToken } });

  if (apiCall.type === CallAPIResultType.SUCCESS && apiCall.status === 200 && apiCall.body) {
    const data = apiCall.body.stop_points.map(d => ({ name: d.name, coord: [ +d.coord.lat, +d.coord.lon ]}));
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

/**
 * status sagas
 */
export default function* () {
  yield [
    call(loadLineData),
    call(loadStopPoints)
  ];
}
