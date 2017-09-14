import * as React from 'react';
import * as d3 from 'd3';

import './MapView.scss';
import { LineData, StopPoints, StopPoint, StopPointConnections, StopPointConnectionsItem } from './reducers';

const STOP_POINTS_RAYON: number = 4.5;
const LAYER_MARGIN: number = STOP_POINTS_RAYON * 3;

interface Props {
  lineData: LineData,
  stopPoints: StopPoints,
  selectedStopPoint: StopPoint,
  stopPointConnections: StopPointConnections,

  onStopPointSelected: (stopPoint: StopPoint) => void,
  onMapZooomed: (zoom: number) => void,
}

interface OverlayActions {
  onStopPointSelected: (stopPoint: StopPoint) => void
}

function createMap(node: HTMLElement) {

  const mapNode = d3.select(node)
                    .append('div')
                    .attr('style', 'height: 100%')
                    .node() as HTMLElement;

  // center on France
  const map = new google.maps.Map(mapNode, {
    clickableIcons: false, // disable all default clickable UI interactions
    zoom: 6,
    center: new google.maps.LatLng(47.46972222706748, 2.35472812402350850),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });
  map.setOptions({styles: [{ featureType: 'poi.business', stylers: [{visibility: 'off'}] } ]});
  return map
}

function computePathData(projection: google.maps.MapCanvasProjection, ne: google.maps.Point, sw: google.maps.Point, line: google.maps.LatLng[]) {
  const path = d3.path();

  const [ firstPoint, ...otherPoints ] = line;
  const ld = projection.fromLatLngToDivPixel(firstPoint);
  path.moveTo(ld.x - sw.x, ld.y - ne.y);
  otherPoints.forEach(d => {
    const ld = projection.fromLatLngToDivPixel(d);
    path.lineTo(ld.x - sw.x, ld.y - ne.y);
  });

  return path.toString();
}

function computePathDataForConnections(projection: google.maps.MapCanvasProjection, ne: google.maps.Point, sw: google.maps.Point, line: google.maps.LatLng[]) {
  const path = d3.path();

  const [ firstPoint, ...otherPoints ] = line;
  const ld = projection.fromLatLngToDivPixel(firstPoint);

  if (ld && sw && ne) {
    path.moveTo(ld.x - sw.x, ld.y - ne.y);
    otherPoints.forEach(d => {
      const ld = projection.fromLatLngToDivPixel(d);
      path.lineTo(ld.x - sw.x, ld.y - ne.y);
    });
  }

  return path.toString();
}

/**
 * Complete the line data with the lats and lngs
 *
 * @param {LineData} lineData
 * @returns {{data: LineData; latLngs: google.maps.LatLng[][]}}
 */
function completeLineData(lineData: LineData) {
  return {
    data: lineData,
    latLngs: lineData.coordinates.map(line => line.map(d => new google.maps.LatLng(d[ 1 ], d[ 0 ])))
  }
}

/**
 * Complete the stop points with the lats and the lngs
 *
 * @param {StopPoints} stopPoints
 * @param {StopPoint} selectedStopPoint
 * @returns {{data: StopPoints; latLngs: {name; latLng: google.maps.LatLng}[]}}
 */
function completeStopPoints(stopPoints: StopPoints, selectedStopPoint: StopPoint) {
  return {
    data: stopPoints,  // keep the initial structure to be able to detect when it has been changed
    latLngs: stopPoints.map(
      sp => ({
        stopPoint: sp,
        isSelected: selectedStopPoint && selectedStopPoint.id === sp.id,
        latLng: new google.maps.LatLng(sp.coord[ 0 ], sp.coord[ 1 ])
      })
    )
  };
}

/**
 * Complete the stop points with the lats and the lngs
 *
 * @param {StopPointConnections} stopPointConnections
 * @returns [{ data: StopPointConnections, connections: {latLngs: google.maps.LatLng[], color: string}[] }]
 */
 function completeStopPointConnections(stopPointConnections: StopPointConnections, selectedStopPoint: StopPoint) {
   let obj = {
     data: stopPointConnections,
     connections: []
   } as { data: StopPointConnections, connections: {latLngs: google.maps.LatLng[], color: string}[] };
   let selectedStopPointLatLng = new google.maps.LatLng(selectedStopPoint.coord[0], selectedStopPoint.coord[1]);

   for (let connection of stopPointConnections) {
     if (connection.stops) {
       for (let stop of connection.stops) {
         let stopLatLng = new google.maps.LatLng(stop.coord.lat, stop.coord.lng);
         let latLngs = [selectedStopPointLatLng, stopLatLng] as google.maps.LatLng[];
         obj.connections.push({latLngs: latLngs, color: connection.color});
       }
     }
   }
   return obj;
}

class LineOverlayView extends google.maps.OverlayView {

  readonly _actions: OverlayActions;
  _layerNode: Element | null;
  _bounds: google.maps.LatLngBounds;

  /**
   * an indicator whether the layer has been drawn, so it can be updated when the line data ot the stop points are updated
   */
  _hasDrawn: boolean;

  /**
   * The line data
   */
  _lineData: { data: LineData, latLngs: google.maps.LatLng[][] };

  /**
   * The stop points
   */
  _stopPoints: { data: StopPoints, latLngs: { stopPoint: StopPoint, isSelected: boolean, latLng: google.maps.LatLng }[] };

  /**
   * The selected stop point
   */
  _selectedStopPoint: StopPoint | null;

  /**
   * The selected stop point connections
   */
   _stopPointConnections: { data: StopPointConnections, connections: {latLngs: google.maps.LatLng[], color: string}[] };


  constructor(actions: OverlayActions) {
    super();

    this._actions = actions;
    this._bounds = new google.maps.LatLngBounds();
    this._lineData = { data: { color: '000000', coordinates: [] }, latLngs: [] };
    this._stopPoints = { data: [], latLngs: [] }
    this._stopPointConnections = { data: [{label: '', zoom:0, color: '', stops: [], coord: {lat:0,lng:0} }], connections: [{latLngs: [], color: '000000'}] };
  }

  private updateBounds() {
    const bounds = [ ...this._stopPoints.latLngs.map(d => d.latLng), ...this._lineData.latLngs.reduce((acc, d) => [ ...acc, ...d ], []) ]
      .reduce((bounds, coord) => {
        bounds.extend(coord);
        return bounds;
      }, new google.maps.LatLngBounds());

    if (!bounds.equals(this._bounds)) {
      this._bounds = bounds;

      if (!this._bounds.isEmpty()) {
        const map = (this.getMap() as google.maps.Map);

        map.fitBounds(bounds);
        map.panToBounds(bounds);
      }
    }
  }

  private getLayerCoords() {
    const projection = this.getProjection();
    const sw = projection.fromLatLngToDivPixel(this._bounds.getSouthWest());
    const ne = projection.fromLatLngToDivPixel(this._bounds.getNorthEast());

    // extend the boundaries so that markers on the edge aren't cut in half
    sw.x -= LAYER_MARGIN;
    sw.y += LAYER_MARGIN;
    ne.x += LAYER_MARGIN;
    ne.y -= LAYER_MARGIN;

    return { ne, sw };
  }

  private updateLayer() {
    const layerCoords = this.getLayerCoords();

    d3.select('.stations')
      .attr('width', Math.abs(layerCoords.ne.x - layerCoords.sw.x) + 'px')
      .attr('height', Math.abs(layerCoords.sw.y - layerCoords.ne.y) + 'px')
      .style('position', 'absolute')
      .style('left', layerCoords.sw.x + 'px')
      .style('top', layerCoords.ne.y + 'px');
  }

  updateLineData(lineData: LineData) {
    if (this._lineData && lineData !== this._lineData.data) {
      this._lineData = completeLineData(lineData);

      if (this._hasDrawn) {
        this.updateBounds();
        this.updateLayer();
        this.drawLineData();
      }
    }
  }

  private drawLineData() {
    const projection = this.getProjection();
    const layerCoords = this.getLayerCoords();

    // remove all the lines before refreshing
    d3.select(this._layerNode)
      .selectAll('.lines > .line')
      .remove();

    // the lines
    d3.select(this._layerNode)
      .select('.lines')
      .selectAll('.line')
      .data(this._lineData.latLngs)
      .each(function (line) {
        d3.select(this)
          .attr('d', computePathData(projection, layerCoords.ne, layerCoords.sw, line))
      })
      .enter()
      .append('path')
      .attr('class', 'line')
      .attr('d', line => computePathData(projection, layerCoords.ne, layerCoords.sw, line))
      .attr('stroke', `#${this._lineData.data.color}`)
      .attr('stroke-width', 2)
      .attr('fill', 'none');
  }

  updateStopPoints(stopPoints: StopPoints, selectedStopPoint: StopPoint) {
    if (this._stopPoints && (stopPoints !== this._stopPoints.data || selectedStopPoint !== this._selectedStopPoint)) {
      this._stopPoints = completeStopPoints(stopPoints, selectedStopPoint);
      this._selectedStopPoint = selectedStopPoint;
      if (this._hasDrawn) {
        this.updateBounds();
        this.updateLayer();
        this.drawStopPoints();
      }
    }
  }

  private drawStopPoints() {
    const projection = this.getProjection();
    const layerCoords = this.getLayerCoords();


    // remove all the points before refstopLatLngreshing
    d3.select(this._layerNode)
      .selectAll('.stop-points > .stop-point')
      .remove();

    // the stop points
    d3.select(this._layerNode)
      .select('.stop-points')
      .selectAll('.stop-point')
      .data(this._stopPoints.latLngs)
      .enter()
      .append('circle')
      .attr('class', d => (`stop-point${ d.isSelected ? ' stop-point-selected' : '' }`))
      .attr('r', d => STOP_POINTS_RAYON * (d.isSelected ? 3 : 1))
      .attr('cx', function (d) {
        const ld = projection.fromLatLngToDivPixel(d.latLng);
        return ld.x - layerCoords.sw.x;
      })
      .attr('cy', function (d) {
        const ld = projection.fromLatLngToDivPixel(d.latLng);
        return ld.y - layerCoords.ne.y;
      })
      // .attr('stroke', `#${lineData.color}`)
      // .attr('stroke-width', 1.5)
      .attr('fill', 'node')
      .on('mouseover', function(d) {
        if (!d.isSelected) {
          d3.select(this)
            .transition()
            .duration(300)
            .attr('r', STOP_POINTS_RAYON * 3);
        }
      })
      .on('mouseout', function(d) {
        if (!d.isSelected) {
          d3.select(this)
            .transition()
            .duration(300)
            .attr('r', STOP_POINTS_RAYON);
        }
      })
      .on('click', d => this._actions.onStopPointSelected(d.stopPoint))
      .append('title').text(d => d.stopPoint.name);
  }

  updateStopPointConnections(stopPointConnections: StopPointConnections, selectedStopPoint: StopPoint) {
    if (this._stopPointConnections && stopPointConnections && stopPointConnections !== this._stopPointConnections.data && selectedStopPoint) {
      this._stopPointConnections = completeStopPointConnections(stopPointConnections, selectedStopPoint);
      if (this._hasDrawn) {
        this.updateBounds();
        this.updateLayer();
        this.drawStopPointConnections();
      }
    }
  }

  private drawStopPointConnections() {
    const projection = this.getProjection();
    const layerCoords = this.getLayerCoords();

    d3.select(this._layerNode)
      .selectAll('.stop-point-connections > .stop-point-connection')
      .remove();

    // the lines
    d3.select(this._layerNode)
      .select('.stop-point-connections')
      .selectAll('.stop-point-connection')
      .data(this._stopPointConnections.connections)
      .each(function (line) {
        d3.select(this)
          .attr('d', computePathDataForConnections(projection, layerCoords.ne, layerCoords.sw, line.latLngs))
      })
      .enter()
      .append('path')
      .attr('class', 'stop-point-connection arrow')
      .attr('d', line => computePathDataForConnections(projection, layerCoords.ne, layerCoords.sw, line.latLngs))
      .attr('stroke', d => `#${d.color}`)
      .style("stroke-dasharray", ("10,3"))
      .attr('stroke-width', 2)
      .style("marker-end", "url(#arrow)")

      .attr('fill', 'none');
  }
  // OverlayView interface
  onAdd() {
    if (!this._layerNode) {
      const layer = d3.select(this.getPanes().overlayMouseTarget)
                          .append('svg')
                          .attr('class', 'stations');

      this._layerNode = layer.node() as Element;

      layer
          .append('defs').append('marker')
          .attr('id', 'arrow')
          .attr('refX', 0)
          .attr('refY', 2.5)
          .attr('markerWidth', 5)
          .attr('markerHeight', 5)
          .attr('orient', 'auto')
          .append('path')
          .attr('d', 'M0,0 L5,2.5 L0,5 Z')
          .attr("class", "arrow")

      layer
          .append('g')
          .attr('class', 'lines');

      layer
          .append('g')
          .attr('class', 'stop-points');
      layer
          .append('g')
          .attr('class', 'stop-point-connections');
    }
  }

  draw() {
    this._hasDrawn = true;

    this.updateBounds();
    this.updateLayer();
    this.drawLineData();
    this.drawStopPoints();
    this.drawStopPointConnections();
  }
}

function createOverlay(map: google.maps.Map, actions: OverlayActions) {
  const overlay = new LineOverlayView(actions);

  // Bind our overlay to the map…
  overlay.setMap(map);

  return overlay;
}

export default class MapView extends React.PureComponent<Props> {
  _map: google.maps.Map;
  _overlay: LineOverlayView | null;

  renderChart = (node: HTMLElement) => {

    // Create the Google Map…
    const map = this._map || (this._map = createMap(node));

    const overlay = this._overlay || (this._overlay = createOverlay(map, { onStopPointSelected: this.props.onStopPointSelected }));

    const onMapZooomed = this.props.onMapZooomed;
    let zoom = map.getZoom();
    google.maps.event.addListener(map, 'zoom_changed', function() {
        zoom = map.getZoom();
        onMapZooomed(map.getZoom());
    });
    overlay.updateLineData(this.props.lineData);
    overlay.updateStopPoints(this.props.stopPoints, this.props.selectedStopPoint);
    overlay.updateStopPointConnections(this.props.stopPointConnections, this.props.selectedStopPoint);
    console.log(this.props.stopPointConnections);
  };

  render() {
    return (
      <div style={ {height: '100%'} } ref={ node => node && this.renderChart(node) }/>
    );
  }
}
