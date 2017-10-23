/*!
 * maptalks.IdwLayer v0.1.0
 * LICENSE : MIT
 * (c) 2016-2017 maptalks.org
 */
/*!
 * requires maptalks@>=0.31.0 
 */
import { Coordinate, Extent, Layer, Point, Util, renderer } from 'maptalks';

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

function simpleidw(canvas) {
    if (!(this instanceof simpleidw)) return new simpleidw(canvas);

    this._canvas = canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;

    this._ctx = canvas.getContext('2d');
    this._width = canvas.width;
    this._height = canvas.height;

    this._max = 1;
    this._data = [];
}

simpleidw.prototype = {

    defaultCellSize: 25,

    defaultGradient: {
        0.0: '#000066',
        0.1: 'blue',
        0.2: 'cyan',
        0.3: 'lime',
        0.4: 'yellow',
        0.5: 'orange',
        0.6: 'red',
        0.7: 'Maroon',
        0.8: '#660066',
        0.9: '#990099',
        1.0: '#ff66ff'
    },

    data: function data(_data) {
        this._data = _data;
        return this;
    },

    max: function max(_max) {
        this._max = _max;
        return this;
    },

    add: function add(point) {
        this._data.push(point);
        return this;
    },

    clear: function clear() {
        this._data = [];
        return this;
    },

    cellSize: function cellSize(r) {
        // create a grayscale blurred cell image that we'll use for drawing points
        var cell = this._cell = document.createElement('canvas'),
            ctx = cell.getContext('2d');
        this._r = r;

        cell.width = cell.height = r;

        ctx.beginPath();
        ctx.rect(0, 0, r, r);
        ctx.fill();
        ctx.closePath();

        return this;
    },

    resize: function resize() {
        this._width = this._canvas.width;
        this._height = this._canvas.height;
    },

    gradient: function gradient(grad) {
        // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            gradient = ctx.createLinearGradient(0, 0, 0, 256);

        canvas.width = 1;
        canvas.height = 256;

        for (var i in grad) {
            gradient.addColorStop(+i, grad[i]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 256);

        this._grad = ctx.getImageData(0, 0, 1, 256).data;

        return this;
    },

    draw: function draw(opacity) {
        if (!this._cell) this.cellSize(this.defaultCellSize);
        if (!this._grad) this.gradient(this.defaultGradient);

        var ctx = this._ctx;

        ctx.clearRect(0, 0, this._width, this._height);

        // draw a grayscale idwmap by putting a cell at each data point
        for (var i = 0, len = this._data.length, p; i < len; i++) {
            p = this._data[i];
            ctx.globalAlpha = p[2] / this._max;
            ctx.drawImage(this._cell, p[0] - this._r, p[1] - this._r);
        }

        // colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
        var colored = ctx.getImageData(0, 0, this._width, this._height);
        this._colorize(colored.data, this._grad, opacity * 5);

        ctx.putImageData(colored, 0, 0);

        return this;
    },

    _colorize: function _colorize(pixels, gradient, opacity) {
        for (var i = 0, len = pixels.length, j; i < len; i += 4) {
            j = pixels[i + 3] * 4;

            pixels[i] = gradient[j];
            pixels[i + 1] = gradient[j + 1];
            pixels[i + 2] = gradient[j + 2];
            pixels[i + 3] = opacity * 256;
        }
    }
};

var IdwLayer = function (_maptalks$Layer) {
    _inherits(IdwLayer, _maptalks$Layer);

    function IdwLayer(id, idws, options) {
        _classCallCheck(this, IdwLayer);

        if (!Array.isArray(idws)) {
            options = idws;
            idws = null;
        }

        var _this = _possibleConstructorReturn(this, _maptalks$Layer.call(this, id, options));

        _this._idws = idws || [];
        return _this;
    }

    IdwLayer.prototype.getData = function getData() {
        return this._idws;
    };

    IdwLayer.prototype.setData = function setData(idws) {
        this._idws = idws || [];
        return this.redraw();
    };

    IdwLayer.prototype.addPoint = function addPoint(idw) {
        if (!idw) {
            return this;
        }
        if (idw[0] && Array.isArray(idw[0])) {
            Util.pushIn(this._idws, idw);
        } else {
            this._idws.push(idw);
        }
        return this.redraw();
    };

    IdwLayer.prototype.onConfig = function onConfig(conf) {
        for (var p in conf) {
            if (options[p]) {
                return this.redraw();
            }
        }
        return this;
    };

    IdwLayer.prototype.redraw = function redraw() {
        var renderer$$1 = this._getRenderer();
        if (renderer$$1) {
            renderer$$1.clearIdwCache();
            renderer$$1.setToRedraw();
        }
        return this;
    };

    IdwLayer.prototype.isEmpty = function isEmpty() {
        if (!this._idws.length) {
            return true;
        }
        return false;
    };

    IdwLayer.prototype.clear = function clear() {
        this._idws = [];
        this.redraw();
        this.fire('clear');
        return this;
    };

    /**
     * Export the idwLayer's JSON.
     * @return {Object} layer's JSON
     */


    IdwLayer.prototype.toJSON = function toJSON(options) {
        if (!options) {
            options = {};
        }
        var json = {
            'type': this.getJSONType(),
            'id': this.getId(),
            'options': this.config()
        };
        var data = this.getData();
        if (options['clipExtent']) {
            var clipExtent = new Extent(options['clipExtent']);
            var r = this._getIdwRadius();
            if (r) {
                clipExtent = clipExtent._expand(r);
            }
            var clipped = [];
            for (var i = 0, len = data.length; i < len; i++) {
                if (clipExtent.contains(new Coordinate(data[i][0], data[i][1]))) {
                    clipped.push(data[i]);
                }
            }
            json['data'] = clipped;
        } else {
            json['data'] = data;
        }

        return json;
    };

    /**
     * Reproduce a idwLayer from layer's JSON.
     * @param  {Object} json - layer's JSON
     * @return {maptalks.IdwLayer}
     * @static
     * @private
     * @function
     */


    IdwLayer.fromJSON = function fromJSON(json) {
        if (!json || json['type'] !== 'IdwLayer') {
            return null;
        }
        return new IdwLayer(json['id'], json['data'], json['options']);
    };

    IdwLayer.prototype._getIdwRadius = function _getIdwRadius() {
        if (!this._getRenderer()) {
            return null;
        }
        return this._getRenderer()._idwRadius;
    };

    return IdwLayer;
}(Layer);

IdwLayer.registerJSONType('IdwLayer');

IdwLayer.registerRenderer('canvas', function (_maptalks$renderer$Ca) {
    _inherits(_class, _maptalks$renderer$Ca);

    function _class() {
        _classCallCheck(this, _class);

        return _possibleConstructorReturn(this, _maptalks$renderer$Ca.apply(this, arguments));
    }

    _class.prototype.draw = function draw() {
        var map = this.getMap(),
            layer = this.layer,
            extent = map.getContainerExtent();
        var maskExtent = this.prepareCanvas(),
            displayExtent = extent;
        if (maskExtent) {
            maskExtent = maskExtent.convertTo(function (c) {
                return map._pointToContainerPoint(c);
            });
            //out of layer mask
            if (!maskExtent.intersects(extent)) {
                this.completeRender();
                return;
            }
            displayExtent = extent.intersection(maskExtent);
        }

        if (!this._idw) {
            this._idw = simpleidw(this.canvas);
        }
        this._updateOptions();

        //a cache of heat points' viewpoints.
        if (!this._idwViews) {
            this._idwViews = [];
        }
        var idws = layer.getData();
        if (idws.length === 0) {
            this.completeRender();
            return;
        }
        var data = this._idwData(idws, displayExtent);
        this._idw.data(data).draw(layer.options['opacity']);
        this.completeRender();
    };

    _class.prototype._updateOptions = function _updateOptions() {
        this._idw.cellSize(this.layer.options.cellSize || this._idw.defaultCellSize);

        if (this.layer.options.gradient) {
            this._idw.gradient(this.layer.options.gradient);
        }
        if (this.layer.options.max) {
            this._idw.max(this.layer.options.max);
        }
        if (!this.layer.options.hasOwnProperty('opacity')) {
            this.layer.options.opacity = 0.3;
        }
    };

    _class.prototype.drawOnInteracting = function drawOnInteracting() {
        this.draw();
    };

    _class.prototype._idwData = function _idwData(idws) {
        var map = this.getMap(),
            layer = this.layer;
        var data = [],
            r = this._idw._r,
            size = map.getSize(),
            bounds = new Extent(new Point([-r, -r]), new Point([size.width + r, size.height + r])),
            exp = layer.options.exp === undefined ? 1 : layer.options.exp,
            max = layer.options.max === undefined ? 1 : layer.options.max,
            cellCen = r / 2,
            nCellX = Math.ceil((bounds.xmax - bounds.xmin) / r) + 1,
            nCellY = Math.ceil((bounds.ymax - bounds.ymin) / r) + 1;

        var i = void 0,
            len = void 0,
            cell = void 0,
            j = void 0,
            len2 = void 0,
            len3 = void 0,
            k = void 0,
            interpolVal = void 0;

        for (i = 0, len = nCellY; i < len; i++) {
            for (j = 0, len2 = nCellX; j < len2; j++) {

                var x = i * r,
                    y = j * r;
                var numerator = 0,
                    denominator = 0;

                for (k = 0, len3 = idws.length; k < len3; k++) {
                    var p = map.coordinateToContainerPoint(new Coordinate([idws[k][0], idws[k][1]]));
                    var cp = new Point(y - cellCen, x - cellCen);
                    var dist = cp.distanceTo(p);

                    var val = idws[k].alt !== undefined ? idws[k].alt : idws[k][2] !== undefined ? +idws[k][2] : 1;

                    if (dist === 0) {
                        numerator = val;
                        denominator = 1;
                        break;
                    }

                    var dist2 = Math.pow(dist, exp);

                    numerator += val / dist2;
                    denominator += 1 / dist2;
                }

                interpolVal = numerator / denominator;
                cell = [j * r, i * r, interpolVal];

                if (cell) {
                    data.push([Math.round(cell[0]), Math.round(cell[1]), Math.min(cell[2], max)]);
                }
            }
        }
        return data;
    };

    _class.prototype.onZoomEnd = function onZoomEnd() {
        delete this._idwViews;
        _maptalks$renderer$Ca.prototype.onZoomEnd.apply(this, arguments);
    };

    _class.prototype.onResize = function onResize() {
        if (this.canvas) {
            this._idw._width = this.canvas.width;
            this._idw._height = this.canvas.height;
        }
        _maptalks$renderer$Ca.prototype.onResize.apply(this, arguments);
    };

    _class.prototype.onRemove = function onRemove() {
        this.clearHeatCache();
        delete this._idw;
    };

    _class.prototype.clearHeatCache = function clearHeatCache() {
        delete this._idwViews;
    };

    return _class;
}(renderer.CanvasRenderer));

export { IdwLayer };

typeof console !== 'undefined' && console.log('maptalks.IdwLayer v0.1.0, requires maptalks@>=0.31.0.');
