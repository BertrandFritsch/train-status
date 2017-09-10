import { connect } from 'react-redux';
import { StatusState, State, Period, TimeSlot, Route } from './reducers';
import ActionTypes, { Dispatch } from './actionTypes';
import StopPointTraveller from './StopPointTraveller';

export default connect(
  (state: StatusState) => ({
    selectedStopPoint: state.status.selectedStopPoint
  }),
  (dispatch: Dispatch<State>) => ({
    periodTypeSelected: (selection: Period): void => dispatch({ type: ActionTypes.PERIOD_SELECTED, payload: selection }),
    routeSelected: (route: Route): void => dispatch({ type: ActionTypes.ROUTE_SELECTED, payload: route }),
    timeSlotSelected: (timeSlot: TimeSlot | null): void => dispatch({ type: ActionTypes.TIMESLOT_SELECTED, payload: timeSlot }),
    timeRunningToggled: (date: Date | null): void => dispatch({ type: ActionTypes.TIME_RUNNING_TOGGLED, payload: date })
  }),
  (stateProps, dispatchProps) => ({
    ...stateProps,
    ...dispatchProps
  }))(StopPointTraveller);
