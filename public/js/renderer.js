(function() {
  'use strict'
  global.jQuery = require('jquery/dist/jquery.js');
  global.$ = jQuery;
  require('bootstrap');
  require('datatables.net-bs')(window, $);
  //global.topojson = require('topojson');
  var L = require('leaflet');
  var omnivore = require('leaflet-omnivore');

  //initialize a leaflet map
  var map = L.map('map', {
    zoomControl: true,
    center: [51.50, -0.22],
    zoom: 7,
    minZoom: 7,
    maxZoom: 20
  });

  //layer will be where we store the L.geoJSON we'll be drawing on the map
  var layer;

  // add an OS Maps API tile layer
  var osMaps = L.tileLayer('https://api2.ordnancesurvey.co.uk/mapping_api/v1/service/zxy/EPSG%3A3857/Night 3857/{z}/{x}/{y}.png?key=***REMOVED***', {
    attribution: '&copy; Crown copyright and database rights 2015 Ordnance Survey',
    maxZoom: 20
  }).addTo(map);

  //listen for submit of new query
  $('form').submit(function(e) {
    e.preventDefault();

    clearTable();

    var sql = $('#sqlPane').val();

    //clear the map
    if (map.hasLayer(layer)) {
      layer.clearLayers();
    }

    //pass the query to the sql api endpoint
    $.getJSON('/sql?q=' + sql, function(data) {
      if (!data.error) {
        //convert topojson coming over the wire to geojson using mapbox omnivore
        var features = omnivore.topojson.parse(data); //should this return a featureCollection?  Right now it's just an array of features.
        var geojson = features.toGeoJSON();
        var featurearray = [];
        geojson.features.forEach(function(feature) {
          featurearray.push(feature)
        });
        addLayer(featurearray); //draw the map layer
        buildTable(featurearray); //build the table

      } else {
        //write the error in the sidebar
        $('#notifications').text(data.error)
      }
    })
  })

  //toggle map and data view
  $('.btn-group button').click(function(e) {
    $(this).addClass('active').siblings().removeClass('active');

    var view = $(this)[0].innerText;

    if (view == "Data View") {
      $('#map').hide();
      $('#table').show();
    } else {
      $('#map').show();
      $('#table').hide();
    }

  })


  function addLayer(features) {
    //create an L.geoJson layer, add it to the map
    layer = L.geoJson(features, {
      style: {
        color: '#fff', // border color
        fillColor: 'steelblue',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7
      },
      onEachFeature: function(feature, layer) {
        var table = "<table class='table'><tr><th colspan=2>Feature Information</th></tr>";
        for (var property in feature.properties) {
          table += "<tr><th>" + property + "</th><td>" + feature.properties[property] + "</td></tr>"
        }
        table += "</table>";
        layer.bindPopup(table);
      },
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 4,
          fillColor: "#ff7800",
          color: "#000",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
      }
    }).addTo(map);

    map.fitBounds(layer.getBounds());
    $('#notifications').empty();
  }

  function buildTable(features) {
    //assemble a table from the geojson properties

    //first build the header row
    var fields = Object.keys(features[0].properties);

    $('#table').find('thead').append('<tr/>');
    $('#table').find('tfoot').append('<tr/>');

    fields.forEach(function(field) {
      $('#table').find('thead').find('tr').append('<th>' + field + '</th>');
      $('#table').find('tfoot').find('tr').append('<th>' + field + '</th>')
    });

    features.forEach(function(feature) {
      //create tr with tds in memory
      var $tr = $('<tr/>');

      fields.forEach(function(field) {
        $tr.append('<td>' + feature.properties[field] + '</td>')
      })



      $('#table').find('tbody').append($tr);
    });

    $('#table>table').DataTable();
  }

  function clearTable() {
    $('#table').find('thead').empty();
    $('#table').find('tfoot').empty();
    $('#table').find('tbody').empty();
  };



}());
