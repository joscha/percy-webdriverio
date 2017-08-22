'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _walk = require('walk');

var _walk2 = _interopRequireDefault(_walk);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mimeTypes = require('mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MAX_FILE_SIZE_BYTES = 15728640;
var DEFAULT_SKIPPED_ASSETS = [];

var FileSystemAssetLoader = function () {
  function FileSystemAssetLoader(options) {
    _classCallCheck(this, FileSystemAssetLoader);

    options.skippedAssets = options.skippedAssets || DEFAULT_SKIPPED_ASSETS;
    this.options = options;
  }

  _createClass(FileSystemAssetLoader, [{
    key: 'findSnapshotResources',
    value: function findSnapshotResources(page, percyClient) {
      var _this = this;

      return new Promise(function (resolve) {
        var options = _this.options;
        var buildDir = options.buildDir;
        var mountPath = (options.mountPath || '') + '/';

        var resources = [];
        _walk2.default.walkSync(buildDir, {
          followLinks: true,
          listeners: {
            file: function file(root, fileStats, next) {
              var absolutePath = _path2.default.join(root, fileStats.name);
              var resourceUrl = absolutePath.replace(buildDir, '');
              if (_path2.default.sep === '\\') {
                // Windows support: transform filesystem backslashes into forward-slashes for the URL.
                resourceUrl = resourceUrl.replace('\\', '/');
              }
              if (resourceUrl.charAt(0) === '/') {
                resourceUrl = resourceUrl.substr(1);
              }
              var _iteratorNormalCompletion = true;
              var _didIteratorError = false;
              var _iteratorError = undefined;

              try {
                for (var _iterator = options.skippedAssets[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                  var assetPattern = _step.value;

                  if (resourceUrl.match(assetPattern)) {
                    next();
                    return;
                  }
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

              if (_fs2.default.statSync(absolutePath).size > MAX_FILE_SIZE_BYTES) {
                console.warn('\n[percy][WARNING] Skipping large file: ', resourceUrl); // eslint-disable-line no-console
                return;
              }
              var content = _fs2.default.readFileSync(absolutePath);
              resources.push(percyClient.makeResource({
                resourceUrl: encodeURI('' + mountPath + resourceUrl),
                content: content,
                mimetype: _mimeTypes2.default.lookup(resourceUrl)
              }));
              next();
            }
          }
        });
        resolve(resources);
      });
    }
  }]);

  return FileSystemAssetLoader;
}();

exports.default = FileSystemAssetLoader;