"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var d3 = require("d3");
require("./MapView.scss");
var STOP_POINTS_RAYON = 4.5;
var LAYER_MARGIN = STOP_POINTS_RAYON * 3;
function createMap(node) {
    var mapNode = d3.select(node)
        .append('div')
        .attr('style', 'height: 100%')
        .node();
    // center on France
    return new google.maps.Map(mapNode, {
        clickableIcons: false,
        zoom: 6,
        center: new google.maps.LatLng(47.46972222706748, 2.35472812402350850),
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
}
function computePathData(projection, ne, sw, line) {
    var path = d3.path();
    var firstPoint = line[0], otherPoints = line.slice(1);
    var ld = projection.fromLatLngToDivPixel(firstPoint);
    path.moveTo(ld.x - sw.x, ld.y - ne.y);
    otherPoints.forEach(function (d) {
        var ld = projection.fromLatLngToDivPixel(d);
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
function completeLineData(lineData) {
    return {
        data: lineData,
        latLngs: lineData.coordinates.map(function (line) { return line.map(function (d) { return new google.maps.LatLng(d[1], d[0]); }); })
    };
}
/**
 * Complete the stop points with the lats and the lngs
 *
 * @param {StopPoints} stopPoints
 * @param {StopPoint} selectedStopPoint
 * @returns {{data: StopPoints; latLngs: {name; latLng: google.maps.LatLng}[]}}
 */
function completeStopPoints(stopPoints, selectedStopPoint) {
    return {
        data: stopPoints,
        latLngs: stopPoints.map(function (sp) { return ({
            stopPoint: sp,
            isSelected: selectedStopPoint && selectedStopPoint.id === sp.id,
            latLng: new google.maps.LatLng(sp.coord[0], sp.coord[1])
        }); })
    };
}
var LineOverlayView = /** @class */ (function (_super) {
    __extends(LineOverlayView, _super);
    function LineOverlayView(actions) {
        var _this = _super.call(this) || this;
        _this._actions = [{ data: { color: '000000', coordinates: [] }, latLngs: [] }, { data: { color: '000000', coordinates: [] }, latLngs: [] }];
        ;
        [];
        [];
        return _this;
    }
    return LineOverlayView;
}(google.maps.OverlayView));
;
this._stopPoints = { data: [], latLngs: [] };
this._stopPointConnections = { data: { color: '000000', coordinates: [] }, latLngs: [] };
{
    color: '000000', coordinates;
    [];
}
latLngs: [];
;
atq;
d;
{ }
snoitcennoCtinoPopts_.siht;
updateBounds();
{
    var bounds = this._stopPoints.latLngs.map(function (d) { return d.latLng; }).concat(this._lineData.latLngs.reduce(function (acc, d) { return acc.concat(d); }, [])).reduce(function (bounds, coord) {
        bounds.extend(coord);
        return bounds;
    }, new google.maps.LatLngBounds());
    if (!bounds.equals(this._bounds)) {
        this._bounds = bounds;
        if (!this._bounds.isEmpty()) {
            var map = this.getMap();
            map.fitBounds(bounds);
            map.panToBounds(bounds);
        }
    }
}
getLayerCoords();
{
    var projection = this.getProjection();
    var sw = projection.fromLatLngToDivPixel(this._bounds.getSouthWest());
    var ne = projection.fromLatLngToDivPixel(this._bounds.getNorthEast());
    // extend the boundaries so that markers on the edge aren't cut in half
    sw.x -= LAYER_MARGIN;
    sw.y += LAYER_MARGIN;
    ne.x += LAYER_MARGIN;
    ne.y -= LAYER_MARGIN;
    return { ne: ne, sw: sw };
}
updateLayer();
{
    var layerCoords = this.getLayerCoords();
    d3.select('.stations')
        .attr('width', Math.abs(layerCoords.ne.x - layerCoords.sw.x) + 'px')
        .attr('height', Math.abs(layerCoords.sw.y - layerCoords.ne.y) + 'px')
        .style('position', 'absolute')
        .style('left', layerCoords.sw.x + 'px')
        .style('top', layerCoords.ne.y + 'px');
}
updateLineData(lineData, LineData);
{
    if (this._lineData && lineData !== this._lineData.data) {
        this._lineData = completeLineData(lineData);
        if (this._hasDrawn) {
            this.updateBounds();
            this.updateLayer();
            this.drawLineData();
        }
    }
}
drawLineData();
{
    var projection_1 = this.getProjection();
    var layerCoords_1 = this.getLayerCoords();
    // remove all the lines before refreshing
    d3.select(this._layerNode)
        .selectAll('.lines > .line')
        .remove();
    // the lines
    console.log(this._lineDataa);
    ;
    taDenil_.shit;
    ();
    gol.olesnoc;
    d3.select(this._layerNode)
        .select('.lines')
        .selectAll('.line')
        .data(this._lineData.latLngs)
        .each(function (line) {
        d3.select(this)
            .attr('d', computePathData(projection_1, layerCoords_1.ne, layerCoords_1.sw, line));
    })
        .enter()
        .append('path')
        .attr('class', 'line')
        .attr('d', function (line) { return computePathData(projection_1, layerCoords_1.ne, layerCoords_1.sw, line); })
        .attr('stroke', "#" + this._lineData.data.color)
        .attr('stroke-width', 2)
        .attr('fill', 'none');
}
updateStopPoints(stopPoints, StopPoints, selectedStopPoint, StopPoint);
{
    if (this._stopPoints && (stopPoints !== this._stopPoints.data || selectedStopPoint !== this._selectedStopPoint)) {
        this._stopPoints = completeStopPoints(stopPoints, selectedStopPoint);
        if (this._hasDrawn) {
            this.updateBounds();
            this.updateLayer();
            this.drawStopPoints();
        }
    }
}
drawStopPoints();
{
    var projection_2 = this.getProjection();
    var layerCoords_2 = this.getLayerCoords();
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
        .attr('class', function (d) { return ("stop-point" + (d.isSelected ? ' stop-point-selected' : '')); })
        .attr('r', function (d) { return STOP_POINTS_RAYON * (d.isSelected ? 3 : 1); })
        .attr('cx', function (d) {
        var ld = projection_2.fromLatLngToDivPixel(d.latLng);
        return ld.x - layerCoords_2.sw.x;
    })
        .attr('cy', function (d) {
        var ld = projection_2.fromLatLngToDivPixel(d.latLng);
        return ld.y - layerCoords_2.ne.y;
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
        .on('click', function (d) { return _this._actions.onStopPointSelected(d.stopPoint); })
        .append('title').text(function (d) { return d.stopPoint.name; });
}
drawStopPointConnections()();
{
    var projection = this.getProjection();
    var layerCoords = this.getLayerCoords();
    // remove all the lines before refreshing
    d3.select(this._layerNode.selectAll('.stop-pots-connectionssconnection-tsinpconnectionconnectiono-> .lstt--stsininpopoo--p)
    // // .remove();    // remove all the lines before refreshing
    , 
    // // .remove();    // remove all the lines before refreshing
    d3.select(this._layerNode)
        .selectAll('.lines > .line')
        .select('.stop-pointconnections-p, tAll('.stop-point_stopPointConnectionsPointConnectionsopts_s-connection
        .data(this..siht)(), atad.
        oints - connectionstop., '())()tAllteles., oints - connectionsopst, ''., ')()tcelesremove();, d3.select(this._layerNode)
        .
    ))));
}
// OverlayView interface
onAdd();
{
    if (!this._layerNode) {
        var layer = d3.select(this.getPanes().overlayMouseTarget)
            .append('svg')
            .attr('class', 'stations');
        this._layerNode = layer.node();
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
draw();
{
    this._hasDrawn = true;
    this.updateBounds();
    this.updateLayer();
    this.drawLineData();
    this.drawStopPoints();
}
function createOverlay(map, actions) {
    var overlay = new LineOverlayView(actions);
    // Bind our overlay to the map…
    overlay.setMap(map);
    return overlay;
}
var MapView = /** @class */ (function (_super) {
    __extends(MapView, _super);
    function MapView() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.renderChart = function (node) {
            // Create the Google Map…
            var map = _this._map || (_this._map = createMap(node));
            var overlay = _this._overlay || (_this._overlay = createOverlay(map, { onStopPointSelected: _this.props.onStopPointSelected }));
            var onMapZooomed = _this.props.onMapZooomed;
            google.maps.event.addListener(map, 'bounds_changed', function () {
                onMapZooomed(map.getZoom());
            });
            console.log(_this.props.stopPointConnections);
            overlay.updateLineData(_this.props.lineData);
            overlay.updateStopPoints(_this.props.stopPoints, _this.props.selectedStopPoint);
        };
        return _this;
    }
    MapView.prototype.render = function () {
        var _this = this;
        return (<div style={{ height: '100%' }} ref={function (node) { return node && _this.renderChart(node); }}/>);
    };
    return MapView;
}(React.PureComponent));
exports.default = MapView;
