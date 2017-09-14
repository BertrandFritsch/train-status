import {connect} from 'react-redux';
import {createSelector} from 'reselect';
import {StatusState, State, StopPoint, StopPointConnections} from './reducers';
import ActionTypes, {Dispatch} from './actionTypes';
import MapView from './MapView';

const emptyArray: StopPointConnections = []

const getProps = createSelector(
  (state: StatusState) => state.status.data.lineData,
  (state: StatusState) => state.status.data.stopPoints,
  (state: StatusState) => state.status.selectedStopPoint.stopPoint,
  (state: StatusState) => state.status.selectedStopPoint.routes,
  (state: StatusState) => state.status.selectedStopPoint.selectedRoute,
  (state: StatusState) => state.status.selectedStopPoint.stopPointConnections.length == 0 ? emptyArray : state.status.selectedStopPoint.stopPointConnections,
  (lineData, stopPoints, selectedStopPoint, routes, selectedRoute, stopPointConnections) => {
    const route = routes.find(r => r.id === selectedRoute);

    return {
      lineData: route === undefined ? lineData : {
        color: lineData.color,
        coordinates: [ route.stopPoints.map(sp => [ sp.coord[ 1 ], sp.coord[ 0 ] ]) ]
      },
      stopPoints: route === undefined ? stopPoints : route.stopPoints,
      selectedStopPoint,
      stopPointConnections
    };
  }
);

export default connect(
  (state: StatusState) => getProps(state),
  (dispatch: Dispatch<State>) => ({
    onStopPointSelected: (stopPoint: StopPoint): void => dispatch({
      type: ActionTypes.STOP_POINT_SELECTED,
      payload: stopPoint
    }),
    onMapZooomed: (zoom: number): void => dispatch({
      type: ActionTypes.MAP_ZOOMED,
      payload: zoom
    })
  }),
  (stateProps, dispatchProps) => ({
    ...stateProps,
    ...dispatchProps
  }))(MapView);
