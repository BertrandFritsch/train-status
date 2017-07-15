import { connect } from 'react-redux';
import { State } from './reducers';
import StatusView from './StatusView';

export default connect(
  (state: { status: State }) => ({
    data: state.status.data
  }),
  undefined,
  (stateProps, dispatchProps) => ({
    ...stateProps,
    ...dispatchProps
  }))(StatusView);
