// external dependencies
var gUtil = require('gulp-util'),
  PluginError = gUtil.PluginError,
  through = require('through2'),
  path = require('path');

// internal dependencies
var reactDocgenMarkdown = require('./src/react-docgen-md');

// consts
var PLUGIN_NAME = 'gulp-react-docs';

module.exports = function(options) {
  return through.obj(function(file, encoding, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streams not supported!'));

    } else if (file.isBuffer()) {

      // figure out where the component headings in the markdown doc
      // should link to
      var pathToSrc = options.path,
        srcLink;

      switch (typeof pathToSrc) {
        case 'string':
          pathToSrc = path.resolve(pathToSrc);
          srcLink = path.relative(pathToSrc, file.path);
          break;
        case 'function':
          srcLink = pathToSrc(file.path);
          break;
        default:
          srcLink = '';
      }

      // get the markdown documentation for the file
      var markdownDoc = reactDocgenMarkdown(file.contents, {
        componentName: gUtil.replaceExtension(file.relative, ''),
        srcLink: srcLink,
        absoluteRootPath: pathToSrc
      });

      // replace the file contents and extension
      file.contents = new Buffer(markdownDoc);
      file.path = gUtil.replaceExtension(file.path, '.md');


      const distance = function(lat1, lon1, lat2, lon2, unit) {
        var radlat1 = Math.PI * lat1 / 180
        var radlat2 = Math.PI * lat2 / 180
        var theta = lon1 - lon2
        var radtheta = Math.PI * theta / 180
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(dist)
        dist = dist * 180 / Math.PI
        dist = dist * 60 * 1.1515
        if (unit == "K") {
          dist = dist * 1.609344
        }
        if (unit == "N") {
          dist = dist * 0.8684
        }
        return dist
      }

      const immutable = require('immutable');
      const locationsData = require('./locations.json');

      const reasonableWalkableDistanceMiles = 0.2;

      const parkings = immutable.List(locationsData.parkings.map(function(entry) {
        return immutable.Map({
          parking: entry,
          distance1: null,
          distance2: null
        });
      }));
      // console.log(parkings);
      const parkingResults = parkings.map(function(entry) {
        const entryNoDistance = entry.get("parking");

        // console.log(entry.get("parking"));
        const distanceBetweenStartAndDestination = distance(entryNoDistance.geoPoint.latitude, entryNoDistance.geoPoint.longitude, locationsData.singleLocation.latitude, locationsData.singleLocation.longitude);
        var updatedDistance1;
        if (distanceBetweenStartAndDestination === 0) {
          console.log('destination and start 1 are the same');
          updatedDistance1 = entry.set('distance1', distanceBetweenStartAndDestination.toFixed(2));
          // handle here
          // const updatedGeoPointStart = entry.set('parking', distanceBetweenStartAndDestination.toFixed(2));
        } else {
          // console.log('distance from location 1 in miles ' + distanceBetweenStartAndDestination.toFixed(2));
          // console.log('distance is walkable: ' + (distanceBetweenStartAndDestination <= reasonableWalkableDistanceMiles ? 'yes' : 'no'));

          updatedDistance1 = entry.set('distance1', distanceBetweenStartAndDestination.toFixed(2));
          // console.log(updatedDistance1);
        }


        const distanceBetweenStartAndDestination2 = distance(entryNoDistance.geoPoint.latitude, entryNoDistance.geoPoint.longitude, locationsData.singleLocationFarAwayFromParking.latitude, locationsData.singleLocationFarAwayFromParking.longitude);
        if (distanceBetweenStartAndDestination2 === 0) {
          console.log('destination and start 2 are the same');
        }
        // console.log('distance from location 2 in miles ' + distanceBetweenStartAndDestination2.toFixed(2));
        // console.log('distance is walkable: ' + (distanceBetweenStartAndDestination2 <= reasonableWalkableDistanceMiles ? 'yes' : 'no'));

        const updatedDistance1and2 = updatedDistance1.set('distance2', distanceBetweenStartAndDestination2.toFixed(2));
        // console.log(updatedDistance1and2);

        return updatedDistance1and2;
      });

      // console.log(parkingResults);
      const walkableDistance1Results = parkingResults.filter(function(entry) {
        return entry.get("distance1") <= reasonableWalkableDistanceMiles;
      });
      console.log(walkableDistance1Results.size + ' results within walkable reach for distance 1');

      const walkableDistance2Results = parkingResults.filter(function(entry) {
        return entry.get("distance2") <= reasonableWalkableDistanceMiles;
      });
      console.log(walkableDistance2Results.size + ' results within walkable reach for distance 2');

      return cb(null, file);
    }
  });
};
