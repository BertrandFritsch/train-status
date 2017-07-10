import * as React from 'react';
import * as d3 from 'd3';
//import StatusAPI from 'status';

import './styles.scss';

// const data = require('./data/stations.json');

interface Props {
}

const renderChart = (node: HTMLElement | null) => {

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
      center: new google.maps.LatLng(48.8534100, 2.3488000),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    // fit the map to the boundaries of all available data points and
    // ONCE generate google LatLng objects to be re-used repeatedly
    const bounds = new google.maps.LatLngBounds();
    // d3.entries(data).forEach(function(d) {
    //   bounds.extend(d.value.lat_lng = new google.maps.LatLng(d.value[ 1 ], d.value[ 0 ]));
    // });
    bounds.extend(new google.maps.LatLng(48.900552, 2.25929));
    bounds.extend(new google.maps.LatLng(48.842832, 2.417864));
    map.fitBounds(bounds);
    //
    // const overlay = new google.maps.OverlayView(),
    //   r = 4.5,
    //   padding = r * 2;
    // // Add the container when the overlay is added to the map.
    // overlay.onAdd = function() {
    //   const layer = d3.select(this.getPanes().overlayMouseTarget)
    //                   .append("svg")
    //                   .attr('class', 'stations');
    //   overlay.draw = function() {
    //     const projection = this.getProjection(),
    //       sw = projection.fromLatLngToDivPixel(bounds.getSouthWest()),
    //       ne = projection.fromLatLngToDivPixel(bounds.getNorthEast());
    //     // extend the boundaries so that markers on the edge aren't cut in half
    //     sw.x -= padding;
    //     sw.y += padding;
    //     ne.x += padding;
    //     ne.y -= padding;
    //
    //     d3.select('.stations')
    //       .attr('width', (ne.x - sw.x) + 'px')
    //       .attr('height', (sw.y - ne.y) + 'px')
    //       .style('position', 'absolute')
    //       .style('left', sw.x + 'px')
    //       .style('top', ne.y + 'px');
    //
    //     const marker = layer.selectAll('.marker')
    //                         .data(d3.entries(data))
    //                         .each(function(d) {
    //                           const ld = projection.fromLatLngToDivPixel(d.value.lat_lng);
    //                           return d3.select(this)
    //                                    .attr('cx', ld.x - sw.x)
    //                                    .attr('cy', ld.y - ne.y);
    //                         })
    //                         .enter().append('circle')
    //                         .attr('class', 'marker')
    //                         .attr('r', r)
    //                         .attr('cx', function(d) {
    //                           const ld = projection.fromLatLngToDivPixel(d.value.lat_lng);
    //                           return ld.x - sw.x;
    //                         })
    //                         .attr('cy', function(d) {
    //                           const ld = projection.fromLatLngToDivPixel(d.value.lat_lng);
    //                           return ld.y - ne.y;
    //                         })
    //                         .append('title').text(function(d) {
    //         return d.key;
    //       });
    //   };
    // };
    //
    // // Bind our overlay to the map…
    // overlay.setMap(map);
  }
};

export default (props: Props) => {
  return (
    <div style={ { height: '100%' } } ref={ node => renderChart(node) }/>
  );
}
