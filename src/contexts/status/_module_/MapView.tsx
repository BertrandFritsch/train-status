import * as React from 'react';
import * as d3 from 'd3';
import {TIMEZONE_TIMING} from '../../../utils';

import './MapView.scss';
import {LineData, StopPoints, StopPoint, TimeSlotTrains, TimeSlotTrain, StopPointConnections} from './reducers';
import {TripStopPoint} from "../../../data";

const STOP_POINTS_RAYON: number = 4.5;
const LAYER_MARGIN: number = STOP_POINTS_RAYON * 6;

interface Props {
  lineData: LineData;
  stopPoints: StopPoints;
  selectedStopPoint: StopPoint;
  timeSlotTrains: TimeSlotTrains | null;
  stopPointConnections: StopPointConnections;
  timePosition: Date | null;

  onStopPointSelected: (stopPoint: StopPoint) => void;
  onMapZoomed: (zoom: number) => void;
}

interface OverlayActions {
  onStopPointSelected: (stopPoint: StopPoint) => void
}

function createMap(node: HTMLElement, onMapZoomed: (zoom: number) => void) {

  const mapNode = d3.select(node)
                    .append('div')
                    .attr('style', 'height: 100%')
                    .node() as HTMLElement;

  // center on France
  const map = new google.maps.Map(mapNode, {
    clickableIcons: false, // disable all default clickable UI interactions
    zoom: 6,
    center: new google.maps.LatLng(47.46972222706748, 2.35472812402350850),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    styles: [ {featureType: 'poi.business', stylers: [ {visibility: 'off'} ]} ]
  });

  google.maps.event.addListener(map, 'zoom_changed', () => onMapZoomed(map.getZoom() >= 16 ? 3 : map.getZoom() >= 14 ? 2 : 1));
  return map;
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
 * @param { StopPoint } selectedStopPoint
 * @returns [{ data: StopPointConnections, connections: {latLngs: google.maps.LatLng[], color: string}[] }]
 */
function completeStopPointConnections(stopPointConnections: StopPointConnections, selectedStopPoint: StopPoint) {
  const selectedStopPointLatLng = new google.maps.LatLng(selectedStopPoint.coord[ 0 ], selectedStopPoint.coord[ 1 ]);
  const stepInWeights = stopPointConnections.reduce((acc, connection) => acc + connection.stops.reduce((acc2, stop) => acc2 + stop.stepInWeight, 0), 0);

  return {
    data: stopPointConnections,
    connections: stopPointConnections.reduce(
      (acc, connection) => [ ...acc, ...connection.stops.map(
        stop => ({
          id: stop.id,
          latLngs: [ selectedStopPointLatLng, new google.maps.LatLng(stop.coord.lat, stop.coord.lng) ],
          color: connection.color,
          duration: stop.duration,
          stepInWeight: stop.stepInWeight / stepInWeights
        })
      ) ], []
    )
  };
}

function hypot(a: { x: number, y: number }, b: { x: number, y: number }) {
  return Math.hypot(a.y - b.y, b.x - a.x);
}

interface StopPointConnectionTrain {
  startTime: Date;
  tripId: string;
  stopPointId: string;
  stepOut: number;
}

interface StopPointConnection {
  id: string;
  latLngs: google.maps.LatLng[];
  color: string;
  duration: number;
  stepInWeight: number;
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
  _stopPointConnections: { data: StopPointConnections, connections: StopPointConnection[] };
  _stopPointConnectionTrains: StopPointConnectionTrain[] = [];

  _timeSlotTrains: TimeSlotTrains | null = null;
  _timePosition: Date | null = null;

  constructor(actions: OverlayActions) {
    super();

    this._actions = actions;
    this._bounds = new google.maps.LatLngBounds();
    this._lineData = {data: {color: '000000', coordinates: []}, latLngs: []};
    this._stopPoints = {data: [], latLngs: []};
    this._stopPointConnections = {data: [], connections: []};
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

    return {ne, sw};
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

    // remove all the points before refreshing
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
      .attr('fill', 'node')
      .on('mouseover', function (d) {
        if (!d.isSelected) {
          d3.select(this)
            .transition()
            .duration(300)
            .attr('r', STOP_POINTS_RAYON * 3);
        }
      })
      .on('mouseout', function (d) {
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
          .attr('d', computePathData(projection, layerCoords.ne, layerCoords.sw, line.latLngs))
      })
      .enter()
      .append('path')
      .attr('class', 'stop-point-connection arrow')
      .attr('d', line => computePathData(projection, layerCoords.ne, layerCoords.sw, line.latLngs))
      .attr('stroke', d => `#${d.color}`)
      .style('stroke-dasharray', ("10,3"))
      .attr('stroke-width', 2)
      .style('marker-end', 'url(#arrow)')

      .attr('fill', 'none');
  }

  updateTrains(timeSlotTrains: TimeSlotTrains | null, timePosition: Date | null) {
    if (timeSlotTrains !== this._timeSlotTrains || timePosition !== this._timePosition) {
      const prevTimeSlotTrains = this._timeSlotTrains;
      this._timeSlotTrains = timeSlotTrains;
      this._timePosition = timePosition;

      // ignore changes if only the timePosition value has changed
      if (this._hasDrawn && (prevTimeSlotTrains === null || this._timeSlotTrains === null || prevTimeSlotTrains.trains !== this._timeSlotTrains.trains || prevTimeSlotTrains.timeRunning !== this._timeSlotTrains.timeRunning || !this._timeSlotTrains.timeRunning)) {
        this.drawTrains();
        this.drawConnectionTravellers();
      }
    }
  }

  private drawTrains() {
    const projection = this.getProjection();
    const layerCoords = this.getLayerCoords();

    const completedStopPoints = this._stopPoints.latLngs.map((sp, i) => ({
      stopPoint: sp.stopPoint,
      distance: i < this._stopPoints.latLngs.length - 1 ? hypot(projection.fromLatLngToDivPixel(sp.latLng), projection.fromLatLngToDivPixel(this._stopPoints.latLngs[ i + 1 ].latLng)) : 0
    }));

    /**
     * Compute the distance between 2 consecutive stop points
     */
    function distanceFromToStopPoint(stopPoints: { stopPoint: StopPoint, distance: number }[], stopPoint1: TripStopPoint, stopPoint2: TripStopPoint | undefined) {
      let distance = 0;
      let coord = null;
      let id = null;

      for (let i = 0, iEnd = stopPoints.length; i < iEnd; ++i) {
        if (distance === 0) {
          // assume if the distance is still at 0 => stopPoint1 has not been reached
          if (stopPoints[ i ].stopPoint.id === stopPoint1.id) {
            distance = stopPoints[ i ].distance;
            coord = stopPoints[ i ].stopPoint.coord;
            id = stopPoints[ i ].stopPoint.id
          }
        }
        else if (stopPoint2 === undefined) {
          distance = 0;
          break;
        }
        else if (stopPoints[ i ].stopPoint.id === stopPoint2.id) {
          break;
        }
        else {
          // assume if the distance is greather than 0 and distance2 has not been reached => the train doesn't stop at those points
          distance += stopPoints[ i ].distance;
        }
      }

      return {id, distance, coord};
    }

    /**
     * Completes the time slot train structure with the distance between 2 consecutive stop points
     */
    function completeTrains(trains: TimeSlotTrain[]) {
      return trains.map(train => {
        const trip = train.map((trip, i) => {
          return {
            ...trip,
            geo: distanceFromToStopPoint(completedStopPoints, trip, train[ i + 1 ])
          }
        });

        return {
          distanceTotal: trip.reduce((acc, sp) => acc + sp.geo.distance, 0),
          trip
        };
      });
    }

    // the trains
    const $trains = d3.select(this._layerNode)
                      .select('.trains')
                      .selectAll('.train')
                      .data(this._timeSlotTrains === null ? [] : completeTrains(this._timeSlotTrains.trains), (d: { trip: { date: Date }[]}) => `${d.trip[ 0 ].date.toLocaleTimeString()}-${ d.trip.length }`);

    $trains.exit()
           .interrupt()
           .remove();

    const line = d3.select('.lines > .line').node() as SVGPathElement | null;
    if (line !== null) {

      $trains.interrupt();

      const $updatingTrains = $trains
        .enter()
        .append('circle')
        .attr('class', 'train')
        .attr('fill', () => `#${this._lineData.data.color}`)
        .merge($trains);

      const timeSlotTrains = this._timeSlotTrains;

      if (timeSlotTrains !== null) {

        const chartState = this;
        const timeZoneDepartureTime = timeSlotTrains.trains[ 0 ][ 0 ].date.getTime();
        const timeZoneArrivalTime = timeSlotTrains.trains[ timeSlotTrains.trains.length - 1 ][ timeSlotTrains.trains[ timeSlotTrains.trains.length - 1 ].length - 1 ].date.getTime();
        const timeZoneDuration = timeZoneArrivalTime - timeZoneDepartureTime;

        $updatingTrains
          .each(function (d) {
            const $circle = d3.select(this);
            const startPosition = completedStopPoints.slice(0, completedStopPoints.findIndex(sp => sp.stopPoint.id === d.trip[ 0 ].id)).reduce((acc, sp) => acc + sp.distance, 0);

            const currentPosition: { latLng: google.maps.LatLng, nextStopPoint: number } = $circle.property('__currentPosition');
            let nextStopPoint = currentPosition
              // creation phase: determining the train position according to the position on the path
              ? (() => {
                // set the circle on the last known position
                const pt = projection.fromLatLngToDivPixel(currentPosition.latLng);
                $circle.attr('transform', `translate(${pt.x - layerCoords.sw.x},${pt.y - layerCoords.ne.y})`);
                return currentPosition.nextStopPoint;
              })()
              // ... or to the time given by the cursor
              : d.trip.findIndex(t => chartState._timePosition!.getTime() < t.date.getTime());

            // nextStopPoint === 0 => The train has not yet started

            if (nextStopPoint === 0) {
              nextStopPoint = 1;
            }

            else if (nextStopPoint === -1) {
              // means that the train has reached its destination
              nextStopPoint = d.trip.length;
            }

            // store the geo coords to be able to move it in case the card has been zoomed
            const storeTrainPosition = (position: number, nextStopPoint: number) => {
              const pt = line.getPointAtLength(position);
              $circle.property('__currentPosition', {
                latLng: projection.fromDivPixelToLatLng(new google.maps.Point(layerCoords.sw.x + pt.x, layerCoords.ne.y + pt.y)),
                nextStopPoint
              });
              return pt;
            };

            const storeNextStopPoint = (nextStopPoint: number) => {
              $circle.property('__currentPosition', {...$circle.property('__currentPosition'), nextStopPoint});
            };

            const updateTravellers = (nbOfStopPoints: number) => {

              // determine the size of the train according to the number of travellers
              const stepped = d.trip.slice(0, nbOfStopPoints).reduce((acc, sp) => acc - (sp.stepOut < 0 ? acc : sp.stepOut) + sp.stepIn, 0);

              $circle
                .transition('train-passengers')
                .duration(300)
                .attr('r', STOP_POINTS_RAYON + stepped * (STOP_POINTS_RAYON * 6 - STOP_POINTS_RAYON) / 2000);

              // Add the number of travellers as tooltip
              $circle.select('title')
                     .remove();

              $circle.append('title')
                     .text(`${stepped} passagers`);
            };

            const continueToTheNextStopPoint = (timePosition: Date, trainPosition: number, distance: number, nextStopPoint: number) => {

              chartState.dispatchSteppingOutTravellers(d.trip[ nextStopPoint - 1 ].date, `${d.trip[ 0 ].date.toLocaleTimeString()}-${ d.trip.length }`, d.trip[ nextStopPoint - 1 ].geo.id!, d.trip[ nextStopPoint - 1 ].stepOut);

              const timing = (() => {
                if (nextStopPoint === 1) {
                  // wait until the departure of the train
                  return {
                    delay: Math.max(0, d.trip[ 0 ].date.getTime() - timePosition.getTime()) * TIMEZONE_TIMING / timeZoneDuration,
                    duration: (d.trip[ nextStopPoint ].date.getTime() - Math.max(timePosition.getTime(), d.trip[ nextStopPoint - 1 ].date.getTime())) * TIMEZONE_TIMING / timeZoneDuration
                  }
                }

                else if (nextStopPoint === d.trip.length) {

                  // wait until the end of the timezone
                  return {
                    delay: (timeZoneArrivalTime - Math.max(timePosition.getTime(), d.trip[ d.trip.length - 1 ].date.getTime())) * TIMEZONE_TIMING / timeZoneDuration,
                    duration: 0
                  }
                }

                return {
                  delay: 0,
                  duration: (d.trip[ nextStopPoint ].date.getTime() - Math.max(timePosition.getTime(), d.trip[ nextStopPoint - 1 ].date.getTime())) * TIMEZONE_TIMING / timeZoneDuration
                }
                  ;
              })();

              const trainPositionOnLine = trainPosition; //* line.getTotalLength() / d.distanceTotal;
              const segmentLength = distance; // * line.getTotalLength() / d.distanceTotal;

              $circle
                .transition()
                .delay(timing.delay)
                .duration(timing.duration)
                .attrTween('transform', () => (t: number) => {
                  const pt = storeTrainPosition(trainPositionOnLine + t * segmentLength, nextStopPoint);
                  return `translate(${pt.x},${pt.y})`;
                })
                .on('start', () => updateTravellers(nextStopPoint))
                .on('end', () => {
                  if (nextStopPoint === d.trip.length - 1) {
                    // the last stop point has been reached, make all the travellers step out
                    updateTravellers(nextStopPoint + 1);
                    storeNextStopPoint(nextStopPoint + 1);
                  }

                  else if (nextStopPoint === d.trip.length) {
                    // move the train to the start position to be ready to start over
                    const pt = storeTrainPosition(startPosition, 1);
                    $circle.attr('transform', `translate(${pt.x},${pt.y})`);
                  }

                  continueToTheNextStopPoint(
                    nextStopPoint < d.trip.length ? chartState._timePosition! : new Date(timeZoneDepartureTime),
                    nextStopPoint < d.trip.length ? startPosition + d.trip.slice(0, nextStopPoint).reduce((acc, t) => acc + t.geo.distance, 0) : startPosition,
                    nextStopPoint < d.trip.length ? d.trip[ nextStopPoint ].geo.distance : d.trip[ 0 ].geo.distance,
                    nextStopPoint < d.trip.length ? nextStopPoint + 1 : 1);
                });
            };

            if (timeSlotTrains.timeRunning) {
              const transform = $circle.attr('transform');
              const matches = transform.match(/translate\((-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\)/);

              const spCoord = projection.fromLatLngToDivPixel(new google.maps.LatLng(d.trip[ nextStopPoint - 1 ].geo.coord![ 0 ], d.trip[ nextStopPoint - 1 ].geo.coord![ 1 ]));
              const trainPositionAfterStopPoint = hypot({
                x: spCoord.x - layerCoords.sw.x,
                y: spCoord.y - layerCoords.ne.y
              }, {x: parseInt(matches![ 1 ]), y: parseInt(matches![ 2 ])});

              continueToTheNextStopPoint(
                chartState._timePosition!,
                startPosition + d.trip.slice(0, nextStopPoint - 1).reduce((acc, t) => acc + t.geo.distance, 0) + trainPositionAfterStopPoint,
                d.trip[ nextStopPoint - 1 ].geo.distance - trainPositionAfterStopPoint,
                nextStopPoint);
            }
            else if (chartState._timePosition!.getTime() === timeZoneDepartureTime) {
              // stop event
              updateTravellers(0);
              $circle.attr('transform', () => {
                const pt = storeTrainPosition(startPosition, 1);
                return `translate(${pt.x},${pt.y})`;
              });
            }
          });
      }
    }
  }

  private dispatchSteppingOutTravellers(startTime: Date, tripId: string, stopPointId: string, stepOut: number) {
    if (this._stopPointConnections.connections.length > 0 && stopPointId === 'stop_point:OIF:SP:8738221:800:L') {
      this._stopPointConnectionTrains.push({startTime, tripId, stopPointId, stepOut});

      if (this._hasDrawn) {
        this.drawConnectionTravellers();
      }
    }
  }

  private drawConnectionTravellers() {
    const projection = this.getProjection();
    const layerCoords = this.getLayerCoords();

    function completeConnectionTrains(stopPointConnections: StopPointConnection[], stopPointConnectionTrains: StopPointConnectionTrain[]) {
      return stopPointConnectionTrains.reduce((acc, t) => [ ...acc, ...stopPointConnections.map(c => ({ connection: c, train: t })) ], []);
    }

    const $connectionTrains = d3.select(this._layerNode)
                                .select('.stop-point-connection-trains')
                                .selectAll('.stop-point-connection-train')
                                .data(completeConnectionTrains(this._stopPointConnections.connections, this._stopPointConnectionTrains), (d : { connection: StopPointConnection, train: StopPointConnectionTrain }) => `${d.connection.id}${d.train.stopPointId}-${d.train.tripId}`);

    $connectionTrains.exit()
                     .interrupt()
                     .remove();

    $connectionTrains.interrupt();

    if (this._timeSlotTrains !== null) {

      const $newConnectionTrains = $connectionTrains
        .enter()
        .append('circle')
        .attr('class', 'stop-point-connection-train')
        .attr('fill', d => `#${d.connection.color}`)
        .attr('r', d => STOP_POINTS_RAYON + (d.connection.stepInWeight * d.train.stepOut) * (STOP_POINTS_RAYON * 6 - STOP_POINTS_RAYON) / 2000);

      $newConnectionTrains
        .append('title')
        .text(d => `${Math.round(d.connection.stepInWeight * d.train.stepOut)} passagers`);

      const $updatingConnectionTrains = $newConnectionTrains.merge($connectionTrains);

      const timeSlotTrains = this._timeSlotTrains;
      const timePosition = this._timePosition;
      const timeZoneDepartureTime = timeSlotTrains.trains[ 0 ][ 0 ].date.getTime();
      const timeZoneArrivalTime = timeSlotTrains.trains[ timeSlotTrains.trains.length - 1 ][ timeSlotTrains.trains[ timeSlotTrains.trains.length - 1 ].length - 1 ].date.getTime();
      const timeZoneDuration = timeZoneArrivalTime - timeZoneDepartureTime;

      const removeTrainAtEnd = (train: StopPointConnectionTrain) => {
        this._stopPointConnectionTrains.splice(this._stopPointConnectionTrains.findIndex(t => t === train))
      };

      $updatingConnectionTrains.each(function (d) {
        const $circle = d3.select(this);

        const ptOrg = projection.fromLatLngToDivPixel(d.connection.latLngs[ 0 ]);
        const ptDest = projection.fromLatLngToDivPixel(d.connection.latLngs[ 1 ]);

        const timePositionAfterStopPoint = Math.max(0, (timePosition ? timePosition.getTime() : d.train.startTime.getTime()) - d.train.startTime.getTime());
        const trainPositionAfterStopPoint = timePositionAfterStopPoint *  hypot(ptOrg, ptDest) / (d.connection.duration * 60 * 1000);

        const angle = Math.atan((ptOrg.y - ptDest.y) / (ptDest.x - ptOrg.x));
        const ptReal = { x: ptOrg.x + trainPositionAfterStopPoint * Math.cos(angle), y: ptOrg.y - trainPositionAfterStopPoint * Math.sin(angle) };

        $circle
          .attr('transform', `translate(${ ptReal.x - layerCoords.sw.x },${ ptReal.y - layerCoords.ne.y })`);

        if (timeSlotTrains.timeRunning) {
          $circle
            .transition()
            .ease(d3.easeLinear)
            .duration((d.connection.duration * 60 * 1000 - timePositionAfterStopPoint) * TIMEZONE_TIMING / timeZoneDuration)
            .attr('transform', `translate(${ ptDest.x - layerCoords.sw.x },${ ptDest.y - layerCoords.ne.y })`)
            .on('end', () => {
              // one shot animation
              removeTrainAtEnd(d.train);
              $circle.interrupt().remove();
            });
        }
      });
    }
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
        .attr("class", "arrow");

      layer
        .append('g')
        .attr('class', 'lines');

      layer
        .append('g')
        .attr('class', 'stop-points');

      layer
        .append('g')
        .attr('class', 'stop-point-connections');

      layer
        .append('g')
        .attr('class', 'trains');

      layer
        .append('g')
        .attr('class', 'stop-point-connection-trains');
    }
  }

  draw() {
    this._hasDrawn = true;

    this.updateBounds();
    this.updateLayer();
    this.drawLineData();
    this.drawStopPoints();
    this.drawStopPointConnections();
    this.drawTrains();
    this.drawConnectionTravellers();
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
    const map = this._map || (this._map = createMap(node, this.props.onMapZoomed));

    const overlay = this._overlay || (this._overlay = createOverlay(map, {onStopPointSelected: this.props.onStopPointSelected}));

    overlay.updateLineData(this.props.lineData);
    overlay.updateStopPoints(this.props.stopPoints, this.props.selectedStopPoint);
    overlay.updateStopPointConnections(this.props.stopPointConnections, this.props.selectedStopPoint);
    overlay.updateTrains(this.props.timeSlotTrains, this.props.timePosition);
  };

  render() {
    return (
      <div style={ {height: '100%'} } ref={ node => node && this.renderChart(node) }/>
    );
  }
}
