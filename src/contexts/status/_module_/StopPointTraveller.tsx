// tslint:disable-next-line
// / <reference path="../../../../typings/react-dock.d.ts" />

import * as React from 'react';
import Dock from 'react-dock';
import DatePicker from 'react-datepicker';
import * as moment from 'moment';
import * as d3 from 'd3';
import {shiftMinutesToToday} from '../../../data';
import { TIMEZONE_TIMING } from '../../../utils';

moment.locale('fr');

// generate week days, starting from monday
const weekdays = moment.weekdays(true);

import {PeriodType, Period, SelectedStopPoint, TimeSlot, Route} from './reducers';
import {
  filterTripsOfStopPoint,
  stepInByPeriod,
  StepInByPeriod,
  filterStopPointByYear,
  filterStopPointByDate,
  filterStopPointByFrequency,
  filterStopPointByMonth,
  filterStopPointByWeek,
  gaterWeeksOfStopPoints,
  groupTrainsByHour
} from '../../../data';

import 'react-datepicker/dist/react-datepicker.css';
import './StopPointTraveller.scss';
import { ScaleTime } from 'd3-scale';

interface Props {
  selectedStopPoint: SelectedStopPoint;
  timePosition: Date | null;
  zoomLevel: number;

  periodTypeSelected: (selection: Period) => void;
  timeSlotSelected: (timeSlot: TimeSlot | null) => void;
  routeSelected: (route: Route) => void;
  timeRunningToggled: (date: Date | null) => void;
  onTimingTicked: (date: Date) => void
}

interface ChartState {
  /**
   * The root SVG element
   */
  rootNode: SVGElement | null;

  /**
   * true while the brush is moved by code
   */
  brushMoving: boolean;

  update(): void;

  getTimeRunningCursorPosition(): Date;
}

const width = 400;
const aspectRatio = 3.0; // => 3.0 / 1.0
const height = width / aspectRatio;
const pad = 20; // inner margins
const barWidth = (width - 2 * pad * 2) / 24;
const hour0 = moment().startOf('day').toDate();
const hour24 = moment().endOf('day').toDate();

const xScale = d3.scaleTime()
                 .domain([ hour0, hour24 ])
                 .range([ pad, width - pad ]);

// zoom scaling
const zScale = d3.scaleQuantize()
                 .domain([ 1, 24 ])
                 .range([ 60, 30, 15, 5, 1 ]); // in minutes

function formatTimeSlotDate(date: Date) {
  return date.toLocaleTimeString('fr', {hour: '2-digit', minute: '2-digit'});
}

export default class StopPointTraveller extends React.Component<Props> {

  timePositionElement: HTMLSpanElement | null = null;
  timingTicker = 0;

  enableTimingTicker(enable: boolean) {
    if (enable && !this.timingTicker) {

      const timeSlotTrains = this.props.selectedStopPoint.timeSlotTrains!;
      const timeZoneDepartureTime = timeSlotTrains.trains[ 0 ][ 0 ].date.getTime();
      const timeZoneArrivalTime = timeSlotTrains.trains[ timeSlotTrains.trains.length - 1 ][ timeSlotTrains.trains[ timeSlotTrains.trains.length - 1 ].length -1 ].date.getTime();

      this.timingTicker = window.setTimeout(() => {
        this.props.onTimingTicked(this.chartState.getTimeRunningCursorPosition());
        this.timingTicker = 0;
        this.timePositionElement!.textContent = this.props.timePosition!.toLocaleTimeString('fr-FR');
        this.enableTimingTicker(true);
      }, TIMEZONE_TIMING * TIMEZONE_TIMING / (timeZoneArrivalTime - timeZoneDepartureTime));
    }
    else if (!enable && this.timingTicker) {
      clearTimeout(this.timingTicker);
      this.timingTicker = 0;
      this.timePositionElement && (this.timePositionElement.textContent = this.props.timePosition && this.props.timePosition!.toLocaleTimeString('fr-FR'));
    }
  }

  shouldComponentUpdate(nextProps: Props) {
    // don't update for timePosition changes
    return this.props.selectedStopPoint !== nextProps.selectedStopPoint;
  }

  componentDidUpdate() {
    this.enableTimingTicker(this.props.selectedStopPoint.timeSlotTrains !== null && this.props.selectedStopPoint.timeSlotTrains.timeRunning);
  }

  componentWillUnmount() {
    this.enableTimingTicker(false);
  }

  /**
   * Holds the state of the chart
   * - create the static structure only once
   * - captures the current state to react to the wheel event
   */
  chartState: ChartState = {rootNode: null, brushMoving: false, update: () => {}, getTimeRunningCursorPosition: () => new Date()};

  renderChart = (node: HTMLElement, selectedTrips: StepInByPeriod[]) => {

    const rootNode = this.chartState.rootNode || (() => {
      // create the static structure if it doesn't exist yet

      const $svg = d3.select(node)
                     .append<SVGSVGElement>('svg')
                     .attr('viewBox', `0 0 ${width} ${height}`);

      const $defs = $svg.append("defs");

      $defs.append("clipPath")
           .attr("id", "clip-data")
           .append("rect")
           .attr('x', pad - 2)
           .attr("width", width - pad + 4)
           .attr("height", height);

      $defs.append("clipPath")
           .attr("id", "clip-x-axis")
           .append("rect")
           .attr('x', pad - 2)
           .attr('y', height - pad)
           .attr("width", width - pad + 8)
           .attr("height", height)
           .attr('transform', `translate(-${ barWidth / 2 }, -${height - pad})`);

      // zooming and panning: create the zoom behavior
      const zoom = d3.zoom<SVGGElement, any>()
                     .scaleExtent([ 1, 24 ])
                     .translateExtent([ [ pad, 0 ], [ width - 2 * pad + barWidth, 0 ] ])
                     .extent([ [ pad, 0 ], [ width - 2 * pad + barWidth, 0 ] ])

                     // disable the pan gesture
                     .filter(() => d3.event.type !== 'mousedown')

                     // on zoom events, update the chart
                     .on('zoom', () => this.chartState.update());

      const brush = d3.brushX()
                      .extent([ [ pad, 0 ], [ width - pad, height ] ])

                      //  on start, clean the registered brush update function
                      .on('start', () => {
                        // only interested in user-initiated events
                        if (this.chartState.brushMoving) return;

                        this.props.timeSlotSelected(null);
                      })

                      // on end, register a new brush update function with the selected dates
                      .on('brush end', () => {
                        // only interested in user-initiated events
                        if (this.chartState.brushMoving || d3.event.selection === null) return;

                        const scale = d3.zoomTransform($dataGroup.node()!).rescaleX(xScale as any);
                        const selectedZone = (d3.event.selection as [ number, number ]).map((v: number) => scale.invert(v)) as [ Date, Date ];

                        this.props.timeSlotSelected(selectedZone);
                      });

      const $dataGroup = $svg.append<SVGGElement>('g')
                             .attr('class', 'stop-point-traveller-data')
                             .attr('clip-path', 'url(#clip-data)')

                             // zooming and panning: the pan gesture is attached to the x-wheel event
                             .on('wheel.pan', () => {
                               zoom.translateBy($dataGroup, -d3.event.deltaX * (d3.event.deltaMode ? 120 : 1) / 10, 0);
                             })

                             // zooming and panning: the event is attached to the ancestor of the bars
                             .call(zoom)

                             // brushing: the event is attached to the ancestor of the bars
                             .property('selectionBrush', () => brush)
                             .call(brush);

      $dataGroup.append('g')
                .attr('class', 'stop-point-traveller-data-bars');

      $dataGroup.append('line')
                .attr('class', 'stop-point-traveller-timezone-start')
                .attr('y1', 0)
                .attr('y2', height);

      $dataGroup.append('line')
                .attr('class', 'stop-point-traveller-timezone-end')
                .attr('y1', 0)
                .attr('y2', height);

      $dataGroup.append('line')
                .attr('class', 'stop-point-traveller-time-position')
                .attr('y1', 0)
                .attr('y2', height);

      const $axesGroup = $svg.append('g')
                             .attr('class', 'stop-point-traveller-axis');

      $axesGroup.append('g')
                .attr('class', 'stop-point-traveller-axis-x')
                .attr('transform', `translate(0, ${height - pad})`)
                .attr('clip-path', 'url(#clip-x-axis)');

      $axesGroup.append('g')
                .attr('class', 'stop-point-traveller-axis-y');

      return $svg.node() as SVGElement;
    })();

    const chartUpdate = () => {

      const $dataGroup = d3.select<SVGGElement, any>('g.stop-point-traveller-data');
      const zoomTransform = d3.zoomTransform($dataGroup.node()!);

      const trips = stepInByPeriod(selectedTrips, zScale(zoomTransform.k));

      const $svg = d3.select(rootNode);

      // apply the transformation of the x-axis
      const xZoomedScale = zoomTransform.rescaleX(xScale as any);

      const xAxis = d3.axisBottom<Date>(xZoomedScale)
                      .tickFormat(d3.timeFormat('%H:%M'));

      const yScale = d3.scaleLinear()
                       .domain([ 0, trips.reduce((acc, t) => acc < t.stepIn ? t.stepIn : acc, 100) ])
                       .range([ height - pad, pad ]);

      const yAxis = d3.axisLeft(yScale)
                      .ticks(5)
                      .tickSize(-width)
                      .tickFormat(function(d, i) { return (`${d}${i === arguments[2].length - 1 ? ' voyageurs' : ''}`) });

      $svg.select<SVGGElement>('g.stop-point-traveller-axis-x')
          .call(xAxis)
          .call(($g: any) => {
            $g.select('.domain').remove();
          });

      $svg.select<SVGGElement>('g.stop-point-traveller-axis-y')
          .call(yAxis)
          .call($g => {
            $g.select('.domain').remove();
            $g.selectAll(".tick text")
              .attr("x", (d, i, g) => (i < g.length - 1 ? 15 : 50))
              .attr("dy", -2);
          });

      let $$bars = $dataGroup
        .select<SVGGElement>('.stop-point-traveller-data-bars')
        .selectAll<SVGRectElement, StepInByPeriod>('rect.stop-point-traveller-data-bar')
        .data(trips, d => d.date.toTimeString());

      // cancel any former ongoing transition
      $$bars.interrupt();

      // creation of the bars
      $$bars.enter()
            .append<SVGRectElement>('rect')
            .attr('class', 'stop-point-traveller-data-bar')
            .attr('x', d => xZoomedScale(d.date))
            .attr('y', yScale(0))
            .attr('width', barWidth)
            .attr('height', 0)

            // updating
            .merge($$bars)
            .attr('x', d => xZoomedScale(d.date))
            .transition()
            .duration(300)
            .attr('y', d => yScale(d.stepIn))
            .attr('height', d => yScale(0) - yScale(d.stepIn));

      $$bars = $dataGroup.selectAll<SVGRectElement, StepInByPeriod>('rect.stop-point-traveller-data-bar')
                         .data(trips, d => d.date.toTimeString());

      $$bars.select('title')
            .remove();

      $$bars.append('title')
            .text(d => (`${Math.round(d.stepIn)} voyageurs`));

      // removing
      $$bars.exit()
            .remove();

      const brush = $dataGroup.property('selectionBrush');
      if (brush) {
        try {
          this.chartState.brushMoving = true;
          brush.move($dataGroup, this.props.selectedStopPoint.timeSlot && this.props.selectedStopPoint.timeSlot.map(d => xZoomedScale(d)) as d3.BrushSelection);
        }
        finally {
          this.chartState.brushMoving = false;
        }
      }

      const timeZonePositions = (() => {
        if (this.props.selectedStopPoint.timeSlotTrains !== null) {
          // the timezone starts with the departure of the first train
          const trains = this.props.selectedStopPoint.timeSlotTrains.trains;
          const beginDate = shiftMinutesToToday(trains[ 0 ][ 0 ].date);

          // ... and stops with the arrival of the last train
          const endDate = shiftMinutesToToday(trains[ trains.length - 1 ][ trains[ trains.length - 1 ].length - 1 ].date);

          return {
            start: xZoomedScale(beginDate),
            end: xZoomedScale(endDate),
            cursor: xZoomedScale(this.props.timePosition)
          };
        }
        else {
          return {start: 0, end: 0, cursor: 0};
        }
      })();

      $dataGroup.select('line.stop-point-traveller-timezone-start')
                .attr('x1', timeZonePositions.start)
                .attr('x2', timeZonePositions.start);

      $dataGroup.select('line.stop-point-traveller-timezone-end')
                .attr('x1', timeZonePositions.end)
                .attr('x2', timeZonePositions.end);

      const $cursor = $dataGroup.select('line.stop-point-traveller-time-position');

      $cursor.interrupt();
      $cursor
        .attr('x1', timeZonePositions.cursor)
        .attr('x2', timeZonePositions.cursor);

      if (this.props.selectedStopPoint.timeSlotTrains && this.props.selectedStopPoint.timeSlotTrains.timeRunning) {
        const cycleTimeRunningAnimation = (pos: number) => {
          $cursor
            .attr('x1', pos)
            .attr('x2', pos)
            .transition()
            .ease(d3.easeLinear)
            .duration((timeZonePositions.end - pos) * TIMEZONE_TIMING / (timeZonePositions.end - timeZonePositions.start))
            .attr('x1', timeZonePositions.end)
            .attr('x2', timeZonePositions.end)
            .on('end', () => cycleTimeRunningAnimation(timeZonePositions.start));
        };

        cycleTimeRunningAnimation(timeZonePositions.cursor);
      }
    };

    const getTimeRunningCursorPosition = () => {

      const $dataGroup = d3.select('g.stop-point-traveller-data');
      const zoomTransform = d3.zoomTransform($dataGroup.node() as SVGElement);
      const $cursor = $dataGroup.select('line.stop-point-traveller-time-position');

      // apply the transformation of the x-axis
      const xZoomedScale = zoomTransform.rescaleX(xScale as any);

      return xZoomedScale.invert($cursor.attr('x1'));
    };

    // initial rendering, after the component has been refreshed
    chartUpdate();

    return {
      ...this.chartState,
      rootNode,
      update: chartUpdate,
      getTimeRunningCursorPosition
    }
  };

  render() {
    if (this.props.selectedStopPoint.stopPoint !== null) {

      const periodType = this.props.selectedStopPoint.period.type;
      const filteredByStopPoint = filterTripsOfStopPoint(this.props.selectedStopPoint.stopPoint.id);

      const trips = groupTrainsByHour((() => {

        if (this.props.selectedStopPoint.period.value !== null) {

          switch (this.props.selectedStopPoint.period.type) {
            case PeriodType.YEAR:
              return filterStopPointByYear(filteredByStopPoint, this.props.selectedStopPoint.period.value as number);

            case PeriodType.MONTH:
              return filterStopPointByMonth(filteredByStopPoint, this.props.selectedStopPoint.period.value as number);

            case PeriodType.WEEK:
              return filterStopPointByWeek(filteredByStopPoint, new Date(this.props.selectedStopPoint.period.value as string));

            case PeriodType.DATE:
              return filterStopPointByDate(filteredByStopPoint, this.props.selectedStopPoint.period.value as Date);

            case PeriodType.FREQUENCY:
              return filterStopPointByFrequency(filteredByStopPoint, this.props.selectedStopPoint.period.value as number);

            default:
              return [];
          }
        }
        else {
          return [];
        }
      })());

      return <Dock
        position="bottom"
        isVisible={ true }
        dimMode="none"
        fluid={ false }
        size={ 272 }
      >
        <div style={ {height: '100%', display: 'flex', width: '100%'} }>
          <div className="stop-point-traveller-box">
            <div className="stop-point-traveller-tools">
              <div className="stop-point-traveller-tools-header">
                <label>{ this.props.selectedStopPoint && this.props.selectedStopPoint.stopPoint.name }</label>
                <div className="stop-point-traveller-tools-commands">
                  <button disabled={ this.props.selectedStopPoint.timeSlotTrains === null }
                          onClick={ () => this.props.timeRunningToggled(this.chartState.getTimeRunningCursorPosition()) }>
                    <i
                      className={ `fa ${ this.props.selectedStopPoint.timeSlotTrains && this.props.selectedStopPoint.timeSlotTrains.timeRunning ? 'fa-pause': 'fa-play' }` }/>
                  </button>
                  <button onClick={ () => this.props.timeRunningToggled(null) }>
                    <i
                      className="fa fa-stop"/>
                  </button>
                  <span ref={ node => this.timePositionElement = node } className="stop-point-traveller-tools-time">{ this.props.timePosition && this.props.timePosition.toLocaleTimeString('fr-FR') }</span>
                </div>
              </div>
              <div className="stop-point-traveller-tools-flux">
                <div className="stop-point-traveller-tools-description">
                  Visualisation du flux de voyageurs sur la ligne
                  entre { this.props.selectedStopPoint.timeSlot && formatTimeSlotDate(this.props.selectedStopPoint.timeSlot[ 0 ]) || '--' }
                  { " et " }{ this.props.selectedStopPoint.timeSlot && formatTimeSlotDate(this.props.selectedStopPoint.timeSlot[ 1 ]) || '--' }
                </div>
              </div>
              <div className="stop-point-traveller-tools-routes">
                { this.props.selectedStopPoint.routes.map(r =>
                  <label key={ r.id }>
                    <input type="radio"
                           name="select-route"
                           onChange={ () => this.props.routeSelected(r) }
                           checked={ r.id === this.props.selectedStopPoint.selectedRoute }
                    /><span>{ r.name }</span></label>
                ) }
              </div>
            </div>
            <div className="stop-point-traveller-chart"
                 ref={ node => node && (this.chartState = this.renderChart(node, trips)) }/>
            <div className="stop-point-traveller-selectors">
              <div className="stop-point-traveller-selectors-header">Affichage par période :</div>
              <div className="stop-point-traveller-selector-container">
                <label>
                  <input type="radio" name="select-period" value={ PeriodType.DATE }
                         onChange={ () => this.props.periodTypeSelected({type: PeriodType.DATE, value: null}) }
                         checked={ periodType === PeriodType.DATE }/>
                  Jour
                </label>
                <DatePicker
                  disabled={ periodType !== PeriodType.DATE }
                  selected={ periodType === PeriodType.DATE && this.props.selectedStopPoint.period.value ? moment(this.props.selectedStopPoint.period.value) : null }
                  onChange={ date => this.props.periodTypeSelected({
                    type: PeriodType.DATE,
                    value: date && date.toDate()
                  }) }
                />
              </div>
              <div className="stop-point-traveller-selector-container">
                <label>
                  <input type="radio" name="select-period" value={ PeriodType.WEEK }
                         onChange={ () => this.props.periodTypeSelected({type: PeriodType.WEEK, value: null}) }
                         checked={ periodType === PeriodType.WEEK }/>
                  Semaine
                </label>
                <select
                  disabled={ periodType !== PeriodType.WEEK }
                  value={ periodType === PeriodType.WEEK && this.props.selectedStopPoint.period.value ? this.props.selectedStopPoint.period.value as string : '' }
                  onChange={ e => this.props.periodTypeSelected({
                    type: PeriodType.WEEK,
                    value: e.target.value !== '' ? e.target.value : null
                  }) }
                >
                  <option value=""/>
                  {
                    periodType === PeriodType.WEEK
                      ? gaterWeeksOfStopPoints()
                        .map((date, i) => (
                          <option key={ i } value={ date.toISOString() }>{ (() => {
                            const m = moment(date);
                            return `W${m.week()} - ${m.format('DD/MM/YYYY')}`;
                          })()
                          }</option>))
                      : null
                  }
                </select>
              </div>
              <div className="stop-point-traveller-selector-container">
                <label>
                  <input type="radio" name="select-period" value={ PeriodType.MONTH }
                         onChange={ () => this.props.periodTypeSelected({type: PeriodType.MONTH, value: null}) }
                         checked={ periodType === PeriodType.MONTH }/>
                  Mois
                </label>
                <select
                  disabled={ periodType !== PeriodType.MONTH }
                  value={ periodType === PeriodType.MONTH && this.props.selectedStopPoint.period.value ? this.props.selectedStopPoint.period.value as number : '' }
                  onChange={ e => this.props.periodTypeSelected({
                    type: PeriodType.MONTH,
                    value: e.target.value !== '' ? parseInt(e.target.value) : null
                  }) }
                >
                  <option value=""/>
                  { moment.months().map((d, i) => (
                    <option key={ i } value={ i }>{ d }</option>)) }
                </select>
              </div>
              <div className="stop-point-traveller-selector-container">
                <label>
                  <input type="radio" name="select-period" value={ PeriodType.YEAR }
                         onChange={ () => this.props.periodTypeSelected({type: PeriodType.YEAR, value: null}) }
                         checked={ periodType === PeriodType.YEAR }/>
                  Année
                </label>
                <select
                  disabled={ periodType !== PeriodType.YEAR }
                  value={ periodType === PeriodType.YEAR && this.props.selectedStopPoint.period.value ? this.props.selectedStopPoint.period.value as number : '' }
                  onChange={ e => this.props.periodTypeSelected({
                    type: PeriodType.YEAR,
                    value: e.target.value ? parseInt(e.target.value) : null
                  }) }
                >
                  <option value=""/>
                  <option key={ 2017 } value={ 2017 }>2017</option>
                </select>
              </div>
              <div className="stop-point-traveller-selectors-header">Affichage par fréquence :</div>
              <div className="stop-point-traveller-selector-container">
                <label>
                  <input type="radio" name="select-period" value={ PeriodType.FREQUENCY }
                         onChange={ () => this.props.periodTypeSelected({type: PeriodType.FREQUENCY, value: null}) }
                         checked={ periodType === PeriodType.FREQUENCY }/>
                  Jour
                </label>
                <select
                  disabled={ periodType !== PeriodType.FREQUENCY }
                  value={ periodType === PeriodType.FREQUENCY && this.props.selectedStopPoint.period.value !== null ? this.props.selectedStopPoint.period.value as number : '' }
                  onChange={ e => this.props.periodTypeSelected({
                    type: PeriodType.FREQUENCY,
                    value: e.target.value !== '' ? parseInt(e.target.value) : null
                  }) }
                >
                  <option value=""/>
                  { weekdays.map((d, i) => (
                    <option key={ i } value={ i < 6 ? i + 1 : 0 }>{ d }</option>)) }
                </select>
              </div>
            </div>
          </div>
        </div>
      </Dock>
    }
    else {
      this.chartState.update();
      this.chartState = {rootNode: null, brushMoving: false, update: () => {}, getTimeRunningCursorPosition: () => new Date()};
      return null;
    }
  }
}
