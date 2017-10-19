import * as maptalks from 'maptalks';

! function () {

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

        data: function (data) {
            this._data = data;
            return this;
        },

        max: function (max) {
            this._max = max;
            return this;
        },

        add: function (point) {
            this._data.push(point);
            return this;
        },

        clear: function () {
            this._data = [];
            return this;
        },

        cellSize: function (r) {
            // create a grayscale blurred cell image that we'll use for drawing points
            const cell = this._cell = document.createElement('canvas'),
                ctx = cell.getContext('2d');
            this._r = r;

            cell.width = cell.height = r;

            ctx.beginPath();
            ctx.rect(0, 0, r, r);
            ctx.fill();
            ctx.closePath();

            return this;
        },

        resize: function () {
            this._width = this._canvas.width;
            this._height = this._canvas.height;
        },

        gradient: function (grad) {
            // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
            const canvas = document.createElement('canvas'),
                ctx = canvas.getContext('2d'),
                gradient = ctx.createLinearGradient(0, 0, 0, 256);

            canvas.width = 1;
            canvas.height = 256;

            for (const i in grad) {
                gradient.addColorStop(+i, grad[i]);
            }

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1, 256);

            this._grad = ctx.getImageData(0, 0, 1, 256).data;

            return this;
        },

        draw: function (opacity) {
            if (!this._cell) this.cellSize(this.defaultCellSize);
            if (!this._grad) this.gradient(this.defaultGradient);

            const ctx = this._ctx;

            ctx.clearRect(0, 0, this._width, this._height);

            // draw a grayscale idwmap by putting a cell at each data point
            for (let i = 0, len = this._data.length, p; i < len; i++) {
                p = this._data[i];
                ctx.globalAlpha = p[2] / this._max;
                ctx.drawImage(this._cell, p[0] - this._r, p[1] - this._r);
            }

            // colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
            const colored = ctx.getImageData(0, 0, this._width, this._height);
            this._colorize(colored.data, this._grad, opacity * 5);

            ctx.putImageData(colored, 0, 0);

            return this;
        },

        _colorize: function (pixels, gradient, opacity) {
            for (let i = 0, len = pixels.length, j; i < len; i += 4) {
                j = pixels[i + 3] * 4;

                pixels[i] = gradient[j];
                pixels[i + 1] = gradient[j + 1];
                pixels[i + 2] = gradient[j + 2];
                pixels[i + 3] = opacity * 256;
            }
        }
    };
    window.simpleidw = simpleidw;
}();

export class IdwLayer extends maptalks.Layer {

    constructor(id, idws, options) {
        if (!Array.isArray(idws)) {
            options = idws;
            idws = null;
        }
        super(id, options);
        this._idws = idws || [];
    }

    getData() {
        return this._idws;
    }

    setData(idws) {
        this._idws = idws || [];
        return this.redraw();
    }

    addPoint(idw) {
        if (!idw) {
            return this;
        }
        if (idw[0] && Array.isArray(idw[0])) {
            maptalks.Util.pushIn(this._idws, idw);
        } else {
            this._idws.push(idw);
        }
        return this.redraw();
    }

    onConfig(conf) {
        for (const p in conf) {
            if (options[p]) {
                return this.redraw();
            }
        }
        return this;
    }

    redraw() {
        const renderer = this._getRenderer();
        if (renderer) {
            renderer.clearIdwCache();
            renderer.setToRedraw();
        }
        return this;
    }

    isEmpty() {
        if (!this._idws.length) {
            return true;
        }
        return false;
    }

    clear() {
        this._idws = [];
        this.redraw();
        this.fire('clear');
        return this;
    }

    /**
     * Export the idwLayer's JSON.
     * @return {Object} layer's JSON
     */
    toJSON(options) {
        if (!options) {
            options = {};
        }
        const json = {
            'type': this.getJSONType(),
            'id': this.getId(),
            'options': this.config()
        };
        const data = this.getData();
        if (options['clipExtent']) {
            let clipExtent = new maptalks.Extent(options['clipExtent']);
            const r = this._getIdwRadius();
            if (r) {
                clipExtent = clipExtent._expand(r);
            }
            const clipped = [];
            for (let i = 0, len = data.length; i < len; i++) {
                if (clipExtent.contains(new maptalks.Coordinate(data[i][0], data[i][1]))) {
                    clipped.push(data[i]);
                }
            }
            json['data'] = clipped;
        } else {
            json['data'] = data;
        }

        return json;
    }

    /**
     * Reproduce a idwLayer from layer's JSON.
     * @param  {Object} json - layer's JSON
     * @return {maptalks.IdwLayer}
     * @static
     * @private
     * @function
     */
    static fromJSON(json) {
        if (!json || json['type'] !== 'IdwLayer') {
            return null;
        }
        return new IdwLayer(json['id'], json['data'], json['options']);
    }


    _getIdwRadius() {
        if (!this._getRenderer()) {
            return null;
        }
        return this._getRenderer()._idwRadius;
    }
}

IdwLayer.registerJSONType('IdwLayer');

IdwLayer.registerRenderer('canvas', class extends maptalks.renderer.CanvasRenderer {

    draw() {
        const map = this.getMap(),
            layer = this.layer,
            extent = map.getContainerExtent();
        let maskExtent = this.prepareCanvas(),
            displayExtent = extent;
        if (maskExtent) {
            maskExtent = maskExtent.convertTo(c => map._pointToContainerPoint(c));
            //out of layer mask
            if (!maskExtent.intersects(extent)) {
                this.completeRender();
                return;
            }
            displayExtent = extent.intersection(maskExtent);
        }

        if (!this._idw) {
            this._idw = window.simpleidw(this.canvas);
        }
        this._updateOptions();

        //a cache of heat points' viewpoints.
        if (!this._idwViews) {
            this._idwViews = [];
        }
        const idws = layer.getData();
        if (idws.length === 0) {
            this.completeRender();
            return;
        }
        const data = this._idwData(idws, displayExtent);
        this._idw.data(data).draw(layer.options['opacity']);
        this.completeRender();
    }

    _updateOptions() {
        this._idw.cellSize(this.layer.options.cellSize || this._idw.defaultCellSize);

        if (this.layer.options.gradient) {
            this._idw.gradient(this.layer.options.gradient);
        }
        if (this.layer.options.max) {
            this._idw.max(this.layer.options.max);
        }
    }

    drawOnInteracting() {
        this.draw();
    }

    _idwData(idws) {
        const map = this.getMap(),
            layer = this.layer;
        const data = [],
            r = this._idw._r,
            size = map.getSize(),
            bounds = new maptalks.Extent(
                new maptalks.Point([-r, -r]),
                new maptalks.Point([size.width + r, size.height + r])),
            exp = layer.options.exp === undefined ? 1 : layer.options.exp,
            max = layer.options.max === undefined ? 1 : layer.options.max,
            cellCen = r / 2,
            nCellX = Math.ceil((bounds.xmax - bounds.xmin) / r) + 1,
            nCellY = Math.ceil((bounds.ymax - bounds.ymin) / r) + 1;

        let i, len, cell, j, len2, len3, k, interpolVal;

        for (i = 0, len = nCellY; i < len; i++) {
            for (j = 0, len2 = nCellX; j < len2; j++) {

                const x = i * r,
                    y = j * r;
                let numerator = 0,
                    denominator = 0;

                for (k = 0, len3 = idws.length; k < len3; k++) {
                    const p = map.coordinateToContainerPoint(new maptalks.Coordinate([idws[k][0], idws[k][1]]));
                    const cp = new maptalks.Point((y - cellCen), (x - cellCen));
                    const dist = cp.distanceTo(p);

                    const val =
                        idws[k].alt !== undefined ? idws[k].alt : idws[k][2] !== undefined ? +idws[k][2] : 1;

                    if (dist === 0) {
                        numerator = val;
                        denominator = 1;
                        break;
                    }

                    const dist2 = Math.pow(dist, exp);

                    numerator += (val / dist2);
                    denominator += (1 / dist2);

                }

                interpolVal = numerator / denominator;
                cell = [j * r, i * r, interpolVal];

                if (cell) {
                    data.push([
                        Math.round(cell[0]),
                        Math.round(cell[1]),
                        Math.min(cell[2], max)
                    ]);
                }
            }
        }
        return data;
    }

    onZoomEnd() {
        delete this._idwViews;
        super.onZoomEnd.apply(this, arguments);
    }

    onResize() {
        if (this.canvas) {
            this._idw._width = this.canvas.width;
            this._idw._height = this.canvas.height;
        }
        super.onResize.apply(this, arguments);
    }

    onRemove() {
        this.clearHeatCache();
        delete this._idw;
    }

    clearHeatCache() {
        delete this._idwViews;
    }
});
