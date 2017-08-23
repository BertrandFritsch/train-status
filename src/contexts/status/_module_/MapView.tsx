import * as React from 'react';
import * as d3 from 'd3';

import './MapView.scss';
import { LineData, StopPoints } from './reducers';

interface Props {
  lineData: LineData,
  stopPoints: StopPoints
}

function createMap(node: HTMLElement) {

  const mapNode = d3.select(node)
                    .append('div')
                    .attr('style', 'height: 100%')
                    .node() as HTMLElement;

  // center on France
  return new google.maps.Map(mapNode, {
    zoom: 6,
    center: new google.maps.LatLng(47.46972222706748, 2.35472812402350850),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });
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

/***
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
 * @returns {{data: StopPoints; latLngs: {name; latLng: google.maps.LatLng}[]}}
 */
function completeStopPoints(stopPoints: StopPoints) {
  return {
    data: stopPoints,
    latLngs: stopPoints.map(
      sp => ({
        name: sp.name, // duplicate the name to easy the lookup
        latLng: new google.maps.LatLng(sp.coord[ 0 ], sp.coord[ 1 ])
      })
    )
  };
}

class LineOverlayView extends google.maps.OverlayView {
  readonly STOP_POINTS_RAYON: number = 4.5;
  readonly LAYER_MARGIN: number = this.STOP_POINTS_RAYON * 2;

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
  _stopPoints: { data: StopPoints, latLngs: { name: string, latLng: google.maps.LatLng }[] };

  constructor() {
    super();

    this._bounds = new google.maps.LatLngBounds();
    this._lineData = { data: { color: '000000', coordinates: [] }, latLngs: [] };
    this._stopPoints = { data: [], latLngs: [] }
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
    sw.x -= this.LAYER_MARGIN;
    sw.y += this.LAYER_MARGIN;
    ne.x += this.LAYER_MARGIN;
    ne.y -= this.LAYER_MARGIN;

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

  updateStopPoints(stopPoints: StopPoints) {
    if (this._stopPoints && stopPoints !== this._stopPoints.data) {
      this._stopPoints = completeStopPoints(stopPoints);

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

    // remove all the points before refreshing
    d3.select(this._layerNode)
      .selectAll('.stop-points > .stop-point')
      .remove();

    // the stop points
    d3.select(this._layerNode)
      .select('.stop-points')
      .selectAll('.stop-point')
      .data(this._stopPoints.latLngs)
      .each(function (d) {
        const ld = projection.fromLatLngToDivPixel(d.latLng);
        return d3.select(this)
                 .attr('cx', ld.x - layerCoords.sw.x)
                 .attr('cy', ld.y - layerCoords.ne.y);
      })
      .enter()
      .append('circle')
      .attr('class', 'stop-point')
      .attr('r', this.STOP_POINTS_RAYON)
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
      .append('title').text(d => d.name);
  }

  // OverlayView interface
  onAdd() {
    if (!this._layerNode) {
      const layer = d3.select(this.getPanes().overlayMouseTarget)
                          .append('svg')
                          .attr('class', 'stations');

      this._layerNode = layer.node() as Element;

      layer
          .append('g')
          .attr('class', 'lines');

      layer
          .append('g')
          .attr('class', 'stop-points');
    }
  }

  draw() {
    this._hasDrawn = true;

    this.updateBounds();
    this.updateLayer();
    this.drawLineData();
    this.drawStopPoints();
  }
}

function createOverlay(map: google.maps.Map) {
  const overlay = new LineOverlayView();

  // Bind our overlay to the map…
  overlay.setMap(map);

  return overlay;
}

export default class MapView extends React.PureComponent<Props> {
  _map: google.maps.Map;
  _overlay: LineOverlayView | null;

  renderChart = (node: HTMLElement, lineData: LineData, stopPoints: StopPoints) => {

    // Create the Google Map…
    const map = this._map || (this._map = createMap(node));

    const overlay = this._overlay || (this._overlay = createOverlay(map));

    overlay.updateLineData(lineData);
    overlay.updateStopPoints(stopPoints);
  };

  render() {
    return (
      <div style={ {height: '100%'} } ref={ node => node && this.renderChart(node, this.props.lineData, this.props.stopPoints) }/>
    );
  }
}
