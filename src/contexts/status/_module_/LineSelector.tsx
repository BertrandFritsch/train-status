import * as React from 'react';
import * as Autosuggest from 'react-autosuggest';

import { SuggestionLine } from './reducers';
import './LineSelector.scss';

interface Props {
  suggestions: Array<SuggestionLine>,

  onSuggestionsRequested: (value: string) => void,
  onSuggestionsClearRequested: () => void,
  onSuggestionSelected: (suggestion: SuggestionLine) => void
}

interface State {
  value: string
}

export default class StationSelector extends React.PureComponent<Props, State> {
  state = {
    value: 'RER A'
  };

  onChange = (newValue: string) => {
    this.setState({
      value: newValue
    });
  };

  render() {
    const renderSuggestion = (suggestion: SuggestionLine) => (
      <span>{ suggestion.name }</span>
    );

    const inputProps = {
      placeholder: 'Ligne',
      value: this.state.value,
      onChange: (_: any, change: Autosuggest.ChangeEvent) => this.onChange(change.newValue)
    };

    return <Autosuggest
      suggestions={ this.props.suggestions }
      onSuggestionsFetchRequested={ ({ value }: { value: string }) => this.props.onSuggestionsRequested(value) }
      onSuggestionsClearRequested={ () => this.props.onSuggestionsClearRequested() }
      getSuggestionValue={ (suggestion: SuggestionLine) => suggestion.name }
      renderSuggestion={ renderSuggestion }
      inputProps={ inputProps }
      onSuggestionSelected={ (_: any, { suggestion }: { suggestion: SuggestionLine }) => this.props.onSuggestionSelected(suggestion) }
    />
  }
}
