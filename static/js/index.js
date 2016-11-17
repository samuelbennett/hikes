$(function() {

    var loadOSMMap = function(gpx_file, target_elem) {
        var style = {
            'Point': new ol.style.Style({
                image: new ol.style.Circle({
                    fill: new ol.style.Fill({
                        color: 'rgba(255,255,0,0.4)'
                    }),
                    radius: 5,
                    stroke: new ol.style.Stroke({
                        color: '#ff0',
                        width: 1
                    })
                })
            }),
            'LineString': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#f00',
                    width: 3
                })
            }),
            'MultiLineString': new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#0f0',
                    width: 3
                })
            })
        };
        var vector = new ol.layer.Vector({
            source: new ol.source.Vector({
                url: gpx_file,
                format: new ol.format.GPX()
            }),
            style: function(feature) {
                return style[feature.getGeometry().getType()];
            }
        });
        var map = new ol.Map({
            target: target_elem,
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM()
                }),
                vector
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat([37.41, 8.82]),
                zoom: 4
            })
        });

        vector.once('change', function(e) {
            if (vector.getSource().getState() === 'ready') {
                var extent = vector.getSource().getExtent();
                console.log(extent);
                map.getView().fit(extent, map.getSize());
            }
        });
    };

    var loadGoogleMap = function(gpx_file, target_elem) {
        var mapOptions = {
            zoom: 8,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        var map = new google.maps.Map(
            target_elem,
            mapOptions
        );

        $.ajax({
            url: gpx_file,
            dataType: "xml",
            success: function(data) {
                var parser = new GPXParser(data, map);
                parser.setElevatorCallback(function() {});
                parser.setTrackColour("#ff0000"); // Set the track line colour
                parser.setTrackWidth(5); // Set the track line width
                parser.setMinTrackPointDelta(0.001); // Set the minimum distance between track points
                parser.centerAndZoom(data);
                parser.addTrackpointsToMap(); // Add the trackpoints
                parser.addRoutepointsToMap();
            }
        });
    }

    var createElevationChart = function(elevationData, target_elem) {
        var datasets = [];
        for (var k in elevationData){
            var data = [];
            if(_.sum(_.zip.apply(_, elevationData[k])[1])===0){ //hide empty elevation sets
                continue;
            }
            _.each(elevationData[k], function(datum){
                data.push({x: datum[0], y: datum[1]})
            })
            datasets.push({'label': k, 'data': data});
        }

        new Chart(target_elem, {
            type: 'line',
            data: {
                datasets: datasets
            },
            options: {
                scales: {
                    xAxes: [{
                        type: 'linear',
                        position: 'bottom'
                    }]
                }
            }
        });
    };

    _.each($(".track"), function(track_elem) {
        var gpx_file = $(track_elem).data('gpx');
        var elevationData = {};

        var osm_map = $(track_elem).find('.maps .osm-map')[0];
        loadOSMMap(gpx_file, osm_map);

        var google_map = $(track_elem).find('.maps .google-map')[0];
        loadGoogleMap(gpx_file, google_map);

        var elevations = $(track_elem).data('elevations');
        for(var k in elevations){
            elevationData[k] = elevations[k];
        }

        var elevation_chart = $(track_elem).find('.maps .elevation-chart .chart')[0];
        createElevationChart(elevationData, elevation_chart);
        
    });
});