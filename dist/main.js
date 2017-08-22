'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.init = init;

var _percyClient = require('percy-client');

var _percyClient2 = _interopRequireDefault(_percyClient);

var _environment = require('percy-client/dist/environment');

var _environment2 = _interopRequireDefault(_environment);

var _package = require('../package.json');

var _fileSystemAssetLoader = require('./fileSystemAssetLoader');

var _fileSystemAssetLoader2 = _interopRequireDefault(_fileSystemAssetLoader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function parseMissingResources(response) {
  return response.body.data && response.body.data.relationships && response.body.data.relationships['missing-resources'] && response.body.data.relationships['missing-resources'].data || [];
}

function gatherSnapshotResources(assetLoaders, rootPage, percyClient) {
  return new Promise(function (resolve, reject) {
    Promise.all(assetLoaders.map(function (loader) {
      return loader.findSnapshotResources(rootPage, percyClient);
    })).then(function (listOfResources) {
      var _ref;

      resolve((_ref = []).concat.apply(_ref, _toConsumableArray(listOfResources)));
    }).catch(function (err) {
      console.log('[percy webdriverio] gatherSnapshotResources.XXX.reject', err); // eslint-disable-line no-console
      reject(err);
    });
  });
}

function uploadMissingResources(percyClient, buildId, response, shaToResource) {
  var missingResources = parseMissingResources(response);
  var promises = [];
  if (missingResources.length > 0) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = missingResources[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var missingResource = _step.value;

        promises.push(percyClient.uploadResource(buildId, shaToResource[missingResource.id].content).then(function () {}).catch(function (err) {
          return console.log('[percy webdriverio] uploadMissingResources', err);
        })); // eslint-disable-line no-console
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }
  return Promise.all(promises);
}

var WebdriverPercy = function WebdriverPercy(browser) {
  _classCallCheck(this, WebdriverPercy);

  if (!browser) {
    throw new Error('A WebdriverIO instance is needed to initialise wdio-screenshot');
  }
  browser.percy = { assetLoaders: [] };

  var token = process.env.PERCY_TOKEN;
  var apiUrl = process.env.PERCY_API;
  var clientInfo = 'percy-webdriverio ' + _package.version;
  browser.percy.environment = new _environment2.default(process.env);
  browser.percy.percyClient = new _percyClient2.default({ token: token, apiUrl: apiUrl, clientInfo: clientInfo });

  browser.addCommand('__percyReinit', function async() {
    // eslint-disable-line prefer-arrow-callback
    browser.percy = { assetLoaders: [] };
    browser.percy.environment = new _environment2.default(process.env);
    browser.percy.percyClient = new _percyClient2.default({ token: token, apiUrl: apiUrl, clientInfo: clientInfo });
  });

  browser.addCommand('percyFinalizeBuild', function async() {
    // eslint-disable-line prefer-arrow-callback
    var percy = browser.percy;
    var percyClient = browser.percy.percyClient;
    return new Promise(function (resolve, reject) {
      percy.createBuild.then(function (percyBuildId) {
        percyClient.finalizeBuild(percyBuildId).then(function () {
          browser.logger.info('percy finalizedBuild[' + percyBuildId + ']: ok');
          resolve(true);
        }).catch(function (err) {
          browser.logger.error('percy finalizedBuild[' + percyBuildId + ']: ' + err);
          reject(err);
        });
      }).catch(function (err) {
        browser.logger.error('percy finalizedBuild failed to get build id');
        reject(err);
      });
    });
  });

  browser.addCommand('percyUseAssetLoader', function (type, options) {
    var percy = browser.percy;
    switch (type) {
      case 'filesystem':
        percy.assetLoaders.push(new _fileSystemAssetLoader2.default(options));
        break;
      default:
        throw new Error('Unexpected asset loader type: ' + type);
    }
  });

  browser.addCommand('percySnapshot', function async(name) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var percy = browser.percy;
    var browserInstance = this;
    var percyClient = percy.percyClient;
    var environment = percy.environment;
    if (percy.createBuild === undefined) {
      percy.createBuild = new Promise(function (resolve, reject) {
        percyClient.createBuild(environment.repo, { resources: [] }).then(function (buildResponse) {
          var buildId = buildResponse.body.data.id;
          resolve(buildId);
        }).catch(function (err) {
          browser.logger.error('percy snapshot failed to creteBuild: ' + err);
          reject(err);
        });
      });
    }
    return new Promise(function (resolve, reject) {
      Promise.resolve(browserInstance.getSource()).then(function (source) {
        percy.createBuild.then(function (buildId) {
          var rootResource = percyClient.makeResource({
            resourceUrl: '/',
            content: source,
            isRoot: true,
            mimetype: 'text/html'
          });
          gatherSnapshotResources(percy.assetLoaders, source, percyClient).then(function (resources) {
            var allResources = resources.concat([rootResource]);
            percyClient.createSnapshot(buildId, allResources, {
              name: name,
              widths: options.widths,
              enableJavaScript: options.enableJavaScript,
              minimumHeight: options.minimumHeight
            }).then(function (snapshotResponse) {
              var snapshotId = snapshotResponse.body.data.id;
              var shaToResource = {};
              shaToResource[rootResource.sha] = rootResource;
              var _iteratorNormalCompletion2 = true;
              var _didIteratorError2 = false;
              var _iteratorError2 = undefined;

              try {
                for (var _iterator2 = resources[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                  var resource = _step2.value;

                  shaToResource[resource.sha] = resource;
                }
              } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion2 && _iterator2.return) {
                    _iterator2.return();
                  }
                } finally {
                  if (_didIteratorError2) {
                    throw _iteratorError2;
                  }
                }
              }

              uploadMissingResources(percyClient, buildId, snapshotResponse, shaToResource).then(function () {
                percyClient.finalizeSnapshot(snapshotId).then(function () {
                  browser.logger.info('percy finalizeSnapshot');
                  resolve();
                }).catch(function (err) {
                  browser.logger.error('percy finalizeSnapshot failed: ' + err);
                  reject(err);
                });
              }).catch(function (err) {
                browser.logger.error('percy uploadMissingResources failed: ' + err);
                reject(err);
              });
            });
          });
        }).catch(function (err) {
          browser.logger.error('percy snapshot failed to createBuild: ' + err);
          reject(err);
        });
      }).catch(function (err) {
        browser.logger.error('percy snapshot failed to get source from browser: ' + err);
        reject(err);
      });
    });
  });
};

function init(webdriverInstance, options) {
  // eslint-disable-line import/prefer-default-export
  return new WebdriverPercy(webdriverInstance, options);
}