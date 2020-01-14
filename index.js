// big circle distance: https://codertw.com/%E5%89%8D%E7%AB%AF%E9%96%8B%E7%99%BC/291373/
let vm = new Vue({
  el: '#app',
  data: () => ({
    title: 'thaiand map',
    svg: null,
    path: null,
    projection: null,
    size: 550,
    counties: [],
    airports: [],
    range: 5,
    nowMark: null,
    markers: [
      { airport: null, x: 100, y: 100 }, { airport: null, x: 50, y: 100 }
    ],
    currentMarker: null,
    distance: 0
  }),
  methods: {
    init() {
      this.initSvg()
      this.loadMap()
      this.loadAirports()
      console.log(this.markers)
    },

    getTypeStyle(marker, attr) {
      let color = '#888'
      let scale = 1

      if (marker.airport) {
        let type = marker.airport.properties.type.split('_')[0]
        console.log(type)
        switch (type) {
          case 'large':
            color = '#f24'
            scale = 1
            break
          case 'medium':
            color = '#f7a727'
            scale = 0.8
            break
          case 'small':
            color = 'green'
            scale = 0.5
            break
        }
      }
      if (attr) {
        return color
      } else {
        return { backgroundColor: color, transform: `scale(${scale})` }
      }

    },

    loadMarker() {
      this.markers.forEach((marker, index) => {
        marker.airport = this.airports[index * 5]

        let coor = this.projection(marker.airport.geometry.coordinates)
        marker.x = coor[0]
        marker.y = coor[1]
      })
      // clac distance
      this.calcDistance()
    },
    initSvg() {
      this.svg = d3.select('#svg').attrs({ 'width': this.size, 'height': this.size, 'viewBox': `0 0 ${this.size} ${this.size}` })

      this.projection = d3.geoMercator()
        .translate([this.size / 2, this.size / 2])
        .center([100.60700225799999, 13.312599563600001])
        .scale(2000)
      console.log(this.projection)
      this.path = d3.geoPath().projection(this.projection)
      console.log('init svg')

    },
    getRad(d) {
      return d * Math.PI / 180.0;
    },
    getGreatCircleDistance(distanceArr) {
      let radArr = distanceArr.map(point => point.map(d => this.getRad(d)))
      let disArr = radArr.reduce((total, rad) => [rad[0] - total[0], rad[1] - total[1]], [0, 0])
      var EARTH_RADIUS = 6378.137; //單位kM
      var s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(disArr[0] / 2), 2) + Math.cos(radArr[0][1]) * Math.cos(radArr[1][1]) * Math.pow(Math.sin(disArr[1] / 2), 2)));
      s = s * EARTH_RADIUS;
      s = Math.round(s * 10000) / 10000.0;
      return parseInt(s)
    },
    calcDistance() {
      // invert 把投影點轉換成實際經緯度
      let latlngArr = this.markers.map(marker => this.projection.invert([marker.x, marker.y]))
      this.distance = this.getGreatCircleDistance(latlngArr)
    },
    getTransform(d) {
      let coor = this.projection(d.geometry.coordinates)
      d.coor = coor
      return `translate(${coor[0]},${coor[1]})`
    },
    loadAirports() {
      let url = './data/airports.geojson'
      // json use fetch api: change in version 5
      d3.json(url).then(geometry => {
        this.airports = geometry.features
        this.$nextTick(() => {
          this.svg.selectAll('.airport').data(this.airports)
          // 
          this.loadMarker()
        })
      })
    },
    loadMap() {
      let url = './data/trimCounty.json'
      d3.json(url).then(data => {
        this.counties = data.features
        this.$nextTick(() => {
          console.log(this.svg.selectAll('path'))
          this.svg.select('.country').selectAll('path').data(this.counties).attrs({ d: this.path, fill: '#EE7738' })

        })
      })
    },
    getScale(marker) {
      return `scale(${this.currentMarker === marker ? 0.6 : 0.8})`
    },
    downMarker(evt, marker) {
      this.currentMarker = marker
    },
    moveMarker(evt, marker) {
      if (this.currentMarker) {
        marker.x = evt.layerX
        marker.y = evt.layerY
        this.setNewMarker(marker)
        this.calcDistance()
      }
    },
    clickAndSetMarker(marker) {
      let m = this.markers[0]
      m.airport = marker
      m.x = marker.coor[0]
      m.y = marker.coor[1]
      this.nowMark = marker
      this.calcDistance()

    },
    setNewMarker(marker) {
      let aroundAirplane = this.findAroundAirplane(marker)
      if (aroundAirplane) {
        marker.x = aroundAirplane.coor[0]
        marker.y = aroundAirplane.coor[1]
        marker.airport = aroundAirplane
      } else {
        marker.airport = null
      }
      // set range circle
      this.nowMark = aroundAirplane
    },
    findAroundAirplane(marker) {
      let target = this.airports.find(ap => {
        return Math.sqrt(Math.pow((ap.coor[0] - marker.x), 2) + Math.pow((ap.coor[1] - marker.y), 2)) < 5
      })
      return target
    },
    upMarker(evt, marker) {

      this.currentMarker = null
    }
  },
  mounted() {
    this.init()
  }
})
