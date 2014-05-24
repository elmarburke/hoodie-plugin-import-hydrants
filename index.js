module.exports = function(hoodie, doneCallback) {
  'use strict';
  var request = require('request');
  var async = require('async');

  hoodie.task.on('importhydrants:add', handleImport);

  function handleImport(dbName, importRequest) {

    var overpassUrl = 'http://overpass-api.de/api/interpreter?data=';
    var query = '[out:json];area["name"="'+
      importRequest.area+'"];(node["emergency"="fire_hydrant"](area););out body;>;out skel qt;';
    request(overpassUrl + encodeURI(query), function(error, response, body) {
      if(error) {
        return hoodie.task.error(dbName, importRequest, error);
      }

      var hydrants = JSON.parse(body).elements;

      var db = hoodie.database(dbName);

      async.eachLimit(hydrants, 20, function(osmHydrant, callback) {
        var hydrant = {
          id: osmHydrant.id,
          osmId: osmHydrant.id,
          lat: osmHydrant.lat,
          lng: osmHydrant.lon,
          hydrantType: osmHydrant.tags['fire_hydrant:type'],
          pipeDiameter: osmHydrant.tags['fire_hydrant:pipe_diameter'],
          ref: osmHydrant.tags.ref
        };
        db.add('hydrant', hydrant, callback);
      }, function(err) {
        if(err) {
          console.error(err);
          return hoodie.task.error(dbName, importRequest, err);
        }
        return hoodie.task.success(dbName, importRequest);

      });

    });
  }

  doneCallback();
};
