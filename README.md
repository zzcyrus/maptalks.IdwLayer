# maptalks-plugin-IdwLayer

A small maptalks plugin to generate an IDW interpolated map, based on [Leaflet.idw](https://github.com/JoranBeaufort/Leaflet.idw) by JoranBeaufort

![](https://raw.githubusercontent.com/zzcyrus/readme_demo/master/img/maptalks.idwlayer.demo.png)

## Examples

[Demo](http://kael.top/maptalks.IdwLayer/demo/demo.html)

## Install

Just include the maptalks-IdwLayer.js/maptalks-Idwlayer.min.js from the dist folder:
```
<script src="maptalks-IdwLayer.js"></script>
```

## Usage

```js
var idw = new maptalks.IdwLayer('idw', data, {
    opacity: 0.3,
    cellSize: 10,
    exp: 2,
    max: 1200
}).addTo(map);
```


## `Constructor`
```javascript
new maptalks.IdwLayer(id, data, options)
```

* id **String** layer id
* data **Array[]** layer data: [[x, y, value], [x, y, value]..]
* options **Object** options
    * max **Number** maximum point values (1 by default) 
    * exp  **Number** exponent used for weighting(1 by default)
    * cellSize **Number**  height and width of each cell(25 by default)
    * opacity **Number** the opacity of the IDW layer (0.3 by default)
    * gradient **Object** color gradient config, e.g. {0.4: 'blue', 0.65: 'lime', 1: 'red'} (demo by default)

* more infomation please check [maptalks.Layer](https://maptalks.github.io/maptalks.js/api/0.x/Layer.html)