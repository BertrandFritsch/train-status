import { connect } from 'react-redux';
import { StatusState, State, Period } from './reducers';
import ActionTypes, { Dispatch } from './actionTypes';
import StopPointTraveller from './StopPointTraveller';

export default connect(
  (state: StatusState) => ({
    selectedStopPoint: state.status.selectedStopPoint
  }),
  (dispatch: Dispatch<State>) => ({
    periodTypeSelected: (selection: Period): void => dispatch({ type: ActionTypes.PERIOD_SELECTED, payload: selection })
  }),
  (stateProps, dispatchProps) => ({
    ...stateProps,
    ...dispatchProps
  }))(StopPointTraveller);
