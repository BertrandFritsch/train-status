// tslint:disable-next-line
// / <reference path="../../../../typings/react-dock.d.ts" />

import * as React from 'react';
import Dock from 'react-dock';
import DatePicker from 'react-datepicker';
import * as moment from 'moment';
import * as d3 from 'd3';

moment.locale('fr');

// generate week days, starting from monday
const weekdays = moment.weekdays(true);

import {PeriodType, Period, SelectedStopPoint} from './reducers';
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
  groupTrainByHour
} from '../../../data';

import 'react-datepicker/dist/react-datepicker.css';
import './StopPointTraveller.scss';

interface Props {
  selectedStopPoint: SelectedStopPoint,

  periodTypeSelected: (selection: Period) => void
}

interface ChartState {
  /**
   * The root SVG element
   */
  rootNode: SVGElement | null;

  /**
   * The current zoom level
   */
  zoomLevel: number;

  /**
   * The current transformation of the histogram
   */
  transform: any | null;

  update(): void;
}

// zoom scaling
const zScale = d3.scaleQuantize()
                 .domain([ 1, 24 ])
                 .range([ 60, 30, 15, 5, 1 ]); // in minutes

export default class StopPointTraveller extends React.PureComponent<Props> {
  readonly hour0 = moment().startOf('day').toDate();
  readonly hour24 = moment().endOf('day').toDate();

  /**
   * Holds the state of the chart
   * - create the static structure only once
   * - captures the current state to react to the wheel event
   */
  chartState: ChartState = {rootNode: null, zoomLevel: 60, transform: null, update: () => {}};

  renderChart = (node: HTMLElement, selectedTrips: StepInByPeriod[]) => {

    const width = 400;
    const aspectRatio = 3.0 / 1.0;
    const height = width / aspectRatio;
    const pad = 20; // inner margins
    const barWidth = (width - 2 * pad * 2) / 24;

    const rootNode = this.chartState.rootNode || (() => {
      // create the static structure if it doesn't exist yet

      const $svg = d3.select(node)
                     .append('svg')
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

      const $dataGroup = $svg.append('g')
                             .attr('class', 'stop-point-traveller-data')
                             .attr('clip-path', 'url(#clip-data)')

                             // zooming and panning: the event is attached to the ancestor of the bars
                             .call(d3.zoom()
                                     .scaleExtent([ 1, 24 ])
                                     .translateExtent([ [ pad, 0 ], [ width - 2 * pad + barWidth, height ] ])
                                     .extent([ [ pad, 0 ], [ width - 2 * pad + barWidth, height ] ])
                                     .on('zoom', () => {

                                       // update the scaling data
                                       this.chartState = {
                                         ...this.chartState,
                                         zoomLevel: zScale(d3.event.transform.k),
                                         transform: d3.event.transform
                                       };

                                       // refresh the chart
                                       this.chartState.update();
                                     }));

      // zooming and panning: a rect element is added behind the bars to capture the mouse events between the bars
      $dataGroup.append('rect')
                .attr('x', pad)
                .attr('width', width - 2 * pad + barWidth)
                .attr('height', height)
                .attr('fill', 'none')
                .attr('pointer-events', 'all');

      const $axesGroup = $svg.append('g')
                             .attr('class', 'stop-point-traveller-axis');

      $axesGroup.append('g')
                .attr('class', 'stop-point-traveller-axis-x')
                .attr('transform', `translate(${ barWidth / 2 }, ${height - pad})`)
                .attr('clip-path', 'url(#clip-x-axis)');

      $axesGroup.append('g')
                .attr('class', 'stop-point-traveller-axis-y');

      return $svg.node() as SVGElement;
    })();

    const chartUpdate = () => {

      const trips = stepInByPeriod(selectedTrips, this.chartState.zoomLevel);

      const $svg = d3.select(rootNode);

      let xScale = d3.scaleTime()
                     .domain([ this.hour0, this.hour24 ])
                     .range([ pad, width - pad ]);

      if (this.chartState.transform) {
        // apply the transformation of the x-axis if any has been stored in the state
        xScale = this.chartState.transform.rescaleX(xScale);
      }

      const yScale = d3.scaleLinear()
                       .domain([ 0, 1600 ])
                       .range([ height - pad, pad ]);

      const xAxis = d3.axisBottom(xScale)
                      .tickFormat(d3.timeFormat('%H:%M'));

      const yAxis = d3.axisLeft(yScale)
                      .ticks(5)
                      .tickSize(-width)
                      .tickFormat((d, i) => (`${d}${i === 3 ? ' voyageurs' : ''}`));

      $svg.select('g.stop-point-traveller-axis-x')
                     .call(xAxis)
                     .call(($g: any) => {
                       $g.select('.domain').remove();
                     });

      $svg.select('g.stop-point-traveller-axis-y')
          .call(yAxis)
          .call($g => {
            $g.select('.domain').remove();
            $g.selectAll(".tick text")
              .attr("x", (d, i) => (i < 3 ? 15 : 50))
              .attr("dy", -2);
          });

      const $dataGroup = d3.selectAll('g.stop-point-traveller-data');

      let $$bars = $dataGroup.selectAll('rect.stop-point-traveller-data-bar')
                             .data(trips, (d: StepInByPeriod) => d.date.toTimeString());

      // cancel any former ongoing transition
      $$bars.interrupt();

      // creation of the bars
      $$bars.enter()
            .append('rect')
            .attr('class', 'stop-point-traveller-data-bar')
            .attr('x', d => xScale(d.date))
            .attr('y', yScale(0))
            .attr('width', barWidth)
            .attr('height', 0)

            // updating
            .merge($$bars)
            .attr('x', d => xScale(d.date))
            .transition()
            .duration(300)
            .attr('y', d => yScale(d.stepIn))
            .attr('height', d => yScale(0) - yScale(d.stepIn));

      $$bars = $dataGroup.selectAll('rect.stop-point-traveller-data-bar')
                         .data(trips, (d: StepInByPeriod) => d.date.toTimeString());

      $$bars.select('title')
            .remove();

      $$bars.append('title')
            .text(d => (`${Math.round(d.stepIn)} voyageurs`));

      // removing
      $$bars.exit()
            .remove();
    };

    // initial rendering, after the component has been refreshed
    chartUpdate();

    return {
      ...this.chartState,
      rootNode,
      update: chartUpdate
    }
  };

  render() {
    if (this.props.selectedStopPoint.stopPoint !== null) {

      const periodType = this.props.selectedStopPoint.period.type;
      const filteredByStopPoint = filterTripsOfStopPoint(this.props.selectedStopPoint.stopPoint.id);

      const trips = groupTrainByHour((() => {

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
        size={ 300 }
      >
        <div style={ {height: '100%', display: 'flex'} }>
          <div className="stop-point-traveller-box">
            <div className="stop-point-traveller-header">
              <label>{ this.props.selectedStopPoint && this.props.selectedStopPoint.stopPoint.name }</label>
            </div>
            <div className="stop-point-traveller-chart"
                 ref={ node => node && (this.chartState = this.renderChart(node, trips)) }/>
            <div className="stop-point-traveller-tools">
              <div className="stop-point-traveller-tools-header">Affichage par période :</div>
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
                      ? gaterWeeksOfStopPoints(filteredByStopPoint)
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
              <div className="stop-point-traveller-tools-header">Affichage par fréquence :</div>
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
      return null;
    }
  }
}
