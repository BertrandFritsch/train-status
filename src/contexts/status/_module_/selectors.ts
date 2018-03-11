import { StatusState } from './reducers';

export const getSelectedStopPoint = (state: StatusState) => state.status.selectedStopPoint;
export const getZoomLevel = (state: StatusState) => state.status.zoomLevel;
