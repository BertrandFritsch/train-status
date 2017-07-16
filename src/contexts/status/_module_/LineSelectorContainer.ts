import { connect } from 'react-redux';
import { State, SuggestionLine } from './reducers';
import ActionTypes, { Dispatch } from './actionTypes';
import LineSelector from './LineSelector';

export default connect(
  (state: { status: State }) => ({
    suggestions: state.status.data.lines
  }),
  (dispatch: Dispatch<State>) => ({
    onSuggestionsRequested: (value: string): void => dispatch({ type: ActionTypes.SUGGESTION_LINES_REQUESTED, payload: value }),
    onSuggestionsClearRequested: (): void => dispatch({ type: ActionTypes.SUGGESTION_LINES_RESET }),
    onSuggestionSelected: (item: SuggestionLine): void => dispatch({ type: ActionTypes.SUGGESTION_LINE_REQUESTED, payload: item })
  }),
  (stateProps, dispatchProps) => ({
    ...stateProps,
    ...dispatchProps
  }))(LineSelector);
