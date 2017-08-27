import { connect } from 'react-redux';
import { State, StopPoint } from './reducers';
import ActionTypes, { Dispatch } from './actionTypes';
import MapView from './MapView';

export default connect(
  (state: { status: State }) => ({
    lineData: state.status.data.lineData,
    stopPoints: state.status.data.stopPoints
  }),
  (dispatch: Dispatch<State>) => ({
    onStopPointSelected: (stopPoint: StopPoint): void => dispatch({ type: ActionTypes.STOP_POINT_SELECTED, payload: stopPoint })
  }),
  (stateProps, dispatchProps) => ({
    ...stateProps,
    ...dispatchProps
  }))(MapView);
