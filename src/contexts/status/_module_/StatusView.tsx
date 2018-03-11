import * as React from 'react';

import MapView from './MapViewContainer';
import LineSelectorContainer from './LineSelectorContainer';
import StopPointTravellerContainer from './StopPointTravellerContainer';

export default () => {
  return (
    <div style={ { position: 'relative', height: '100%' } }>
      <MapView/>
      <div className="line-selector-host">
        <LineSelectorContainer/>
      </div>
      <StopPointTravellerContainer />
    </div>
  );
}
