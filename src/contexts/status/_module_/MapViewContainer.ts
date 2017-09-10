import {connect} from 'react-redux';
import {createSelector} from 'reselect';
import {StatusState, State, StopPoint} from './reducers';
import ActionTypes, {Dispatch} from './actionTypes';
import MapView from './MapView';

const getProps = createSelector(
  (state: StatusState) => state.status.data.lineData,
  (state: StatusState) => state.status.data.stopPoints,
  (state: StatusState) => state.status.selectedStopPoint.stopPoint,
  (state: StatusState) => state.status.selectedStopPoint.routes,
  (state: StatusState) => state.status.selectedStopPoint.selectedRoute,
  (lineData, stopPoints, selectedStopPoint, routes, selectedRoute) => {
    const route = routes.find(r => r.id === selectedRoute);

    return {
      lineData: route === undefined ? lineData : {
        color: lineData.color,
        coordinates: [ route.stopPoints.map(sp => [ sp.coord[ 1 ], sp.coord[ 0 ] ]) ]
      },
      stopPoints: route === undefined ? stopPoints : route.stopPoints,
      selectedStopPoint
    };
  }
);

export default connect(
  (state: StatusState) => getProps(state),
  (dispatch: Dispatch<State>) => ({
    onStopPointSelected: (stopPoint: StopPoint): void => dispatch({
      type: ActionTypes.STOP_POINT_SELECTED,
      payload: stopPoint
    })
  }),
  (stateProps, dispatchProps) => ({
    ...stateProps,
    ...dispatchProps
  }))(MapView);
