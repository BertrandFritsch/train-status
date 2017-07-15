import * as React from 'react';
import * as d3 from 'd3';
//import StatusAPI from 'status';

import './styles.scss';
import { StatusData } from './reducers';

interface Props {
  data: StatusData
}

const renderChart = (node: HTMLElement | null, data: StatusData) => {

  if (node) {
    if (node.firstChild) {
      node.removeChild(node.firstChild);
    }

    const mapNode = d3.select(node)
                      .append('div')
                      .attr('style', 'height: 100%')
                      .node() as HTMLElement;


    // Create the Google Map…
    const map = new google.maps.Map(mapNode, {
      zoom: 1,
      // center: new google.maps.LatLng(48.8534100, 2.3488000),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    // fit the map to the boundaries of all available data points and
    // ONCE generate google LatLng objects to be re-used repeatedly
    const lineLatLngs: google.maps.LatLng[][] = [];
    data.lineData.coordinates.forEach(line => {
      const lLineLatLngs: google.maps.LatLng[] = [];
      line.forEach(d => {
        const latLng = new google.maps.LatLng(d[ 1 ], d[ 0 ]);
        lLineLatLngs.push(latLng);
      });
      lineLatLngs.push(lLineLatLngs);
    });

    const spLatLngs = data.stopPoints.map(
      sp => ({
        name: sp.name,
        latLng: new google.maps.LatLng(sp.coord[ 0 ], sp.coord[ 1 ])
      })
    );

    const bounds = new google.maps.LatLngBounds();
    spLatLngs.forEach(sp => {
      bounds.extend(sp.latLng);
    });
    map.fitBounds(bounds);

    const overlay = new google.maps.OverlayView(),
      r = 4.5,
      padding = r * 2;
    // Add the container when the overlay is added to the map.
    overlay.onAdd = function() {
      const layer = d3.select(this.getPanes().overlayMouseTarget)
                      .append("svg")
                      .attr('class', 'stations');
      overlay.draw = function() {
        const computePathData = (line: google.maps.LatLng[]) => {
          const path = d3.path();

          const [ firstPoint, ...otherPoints ] = line;
          const ld = projection.fromLatLngToDivPixel(firstPoint);
          path.moveTo(ld.x - sw.x, ld.y - ne.y);
          otherPoints.forEach(d => {
            const ld = projection.fromLatLngToDivPixel(d);
            path.lineTo(ld.x - sw.x, ld.y - ne.y);
          });

          return path.toString();
        };

        const projection = this.getProjection(),
          sw = projection.fromLatLngToDivPixel(bounds.getSouthWest()),
          ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());
        // extend the boundaries so that markers on the edge aren't cut in half
        sw.x -= padding;
        sw.y += padding;
        ne.x += padding;
        ne.y -= padding;

        d3.select('.stations')
          .attr('width', Math.abs(ne.x - sw.x) + 'px')
          .attr('height', Math.abs(sw.y - ne.y) + 'px')
          .style('position', 'absolute')
          .style('left', sw.x + 'px')
          .style('top', ne.y + 'px');

        // the lines
        layer.selectAll('.line')
             .data(lineLatLngs)
             .each(function(line) {
               d3.select(this)
                 .attr('d', computePathData(line))
             })
             .enter()
             .append('path')
             .attr('class', 'line')
             .attr('d', line => computePathData(line))
             .attr('stroke', `#${data.lineData.color}`)
             .attr('stroke-width', 5)
             .attr('fill', 'none');

        // the stop points
        layer.selectAll('.marker')
             .data(spLatLngs)
             .each(function(d) {
               const ld = projection.fromLatLngToDivPixel(d.latLng);
               return d3.select(this)
                        .attr('cx', ld.x - sw.x)
                        .attr('cy', ld.y - ne.y);
             })
             .enter().append('circle')
             .attr('class', 'marker')
             .attr('r', r)
             .attr('cx', function(d) {
               const ld = projection.fromLatLngToDivPixel(d.latLng);
               return ld.x - sw.x;
             })
             .attr('cy', function(d) {
               const ld = projection.fromLatLngToDivPixel(d.latLng);
               return ld.y - ne.y;
             })
             .attr('stroke', `#${data.lineData.color}`)
             .attr('stroke-width', 1.5)
             .attr('fill', 'node')
             .append('title').text(d => d.name);
      };
    };

    // Bind our overlay to the map…
    overlay.setMap(map);
  }
};

export default (props: Props) => {
  return (
    <div style={ { height: '100%' } } ref={ node => renderChart(node, props.data) }/>
  );
}
