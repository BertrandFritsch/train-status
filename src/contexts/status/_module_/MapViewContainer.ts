import { connect } from 'react-redux';
import { State } from './reducers';
import MapView from './MapView';

export default connect(
  (state: { status: State }) => ({
    lineData: state.status.data.lineData,
    stopPoints: state.status.data.stopPoints
  }),
  undefined,
  (stateProps, dispatchProps) => ({
    ...stateProps,
    ...dispatchProps
  }))(MapView);
