/*
 Copyright 2022 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
/**
 *
 * FeatureLayerStats
 *  - Element: apl-feature-layer-stats
 *  - Description: Feature Layer Statistics
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  2/3/2023 - 0.0.1 -
 * Modified:
 *
 */

class FeatureLayerStats extends HTMLElement {

  static version = '0.0.1';

  static NO_DATA_MESSAGE = "no significant amount measured";

  /**
   * @type {HTMLElement}
   */
  container;

  /**
   * @type {boolean}
   */
  #enabled;

  /**
   * @type {MapView|SceneView}
   */
  #view;

  /**
   * @type {FeatureLayer}
   */
  #featureLayer;

  #minScale;

  #maxScale;

  #statisticsFieldNames = [
    'domestic_demand',
    'domestic_gap',
    'industry_demand',
    'industry_gap',
    'livestock_demand',
    'livestock_gap',
    'irrigation_demand',
    'irrigation_gap',
    'total_demand',
    'total_gap'
  ];

  /**
   *
   */
  #variableInfos = {
    'domestic_demand': {cutoff: 0.01, precision: 2, stdevCount: 3.0},
    'domestic_gap': {cutoff: 0.0001, precision: 4, stdevCount: 2.5},
    'industry_demand': {cutoff: 0.05, precision: 2, stdevCount: 3.0},
    'industry_gap': {cutoff: 0.0001, precision: 4, stdevCount: 2.5},
    'irrigation_demand': {cutoff: 0.05, precision: 2, stdevCount: 3.0},
    'irrigation_gap': {cutoff: 0.0001, precision: 4, stdevCount: 2.5},
    'livestock_demand': {cutoff: 0.001, precision: 3, stdevCount: 3.0},
    'livestock_gap': {cutoff: 0.0001, precision: 4, stdevCount: 2.5},
    'total_demand': {cutoff: 0.05, precision: 2, stdevCount: 3.0},
    'total_gap': {cutoff: 0.05, precision: 2, stdevCount: 2.5}
  };

  #variableStats = {
    'domestic_demand': {"avg": 1.8701870324189545, "count": 1604, "max": 97.62, "min": 0, "stddev": 4.642841466524065, "sum": 2999.780000000003, "variance": 21.55597688327533, "nullcount": 0, "median": 0.3},
    'domestic_gap': {"avg": 0.03982780548628432, "count": 1604, "max": 5.5494, "min": 0, "stddev": 0.24876309531749016, "sum": 63.88380000000004, "variance": 0.061883077591938694, "nullcount": 0, "median": 0},
    'industry_demand': {"avg": 6.156770573566092, "count": 1604, "max": 342.38, "min": 0, "stddev": 19.610577150212038, "sum": 9875.460000000012, "variance": 384.5747361644185, "nullcount": 0, "median": 0.37},
    'industry_gap': {"avg": 0.07875130922693271, "count": 1604, "max": 19.5884, "min": 0, "stddev": 0.7442568523032922, "sum": 126.31710000000007, "variance": 0.5539182622004044, "nullcount": 0, "median": 0},
    'livestock_demand': {"avg": 0.11942768079800477, "count": 1604, "max": 9.203, "min": 0, "stddev": 0.40304695606141877, "sum": 191.56199999999964, "variance": 0.16244684879037524, "nullcount": 0, "median": 0.009},
    'livestock_gap': {"avg": 0.0048791147132169616, "count": 1604, "max": 1.3962, "min": 0, "stddev": 0.05065957025926944, "sum": 7.8261000000000065, "variance": 0.002566392058853857, "nullcount": 0, "median": 0},
    'irrigation_demand': {"avg": 18.62971945137156, "count": 1604, "max": 1431.87, "min": 0, "stddev": 82.51384030818195, "sum": 29882.06999999998, "variance": 6808.533842404153, "nullcount": 0, "median": 0.39},
    'irrigation_gap': {"avg": 0.7560321072319203, "count": 1604, "max": 187.9277, "min": 0, "stddev": 6.43800977529537, "sum": 1212.6755, "variance": 41.44796986679874, "nullcount": 0, "median": 0},
    'total_demand': {"avg": 25.204077306733193, "count": 1604, "max": 1436.48, "min": 0, "stddev": 87.88329300969194, "sum": 40427.34000000004, "variance": 7723.473190227369, "nullcount": 0, "median": 2.485},
    'total_gap': {"avg": 0.8781421446384038, "count": 1604, "max": 192.28, "min": 0, "stddev": 6.931584553257501, "sum": 1408.5399999999997, "variance": 48.04686441895799, "nullcount": 0, "median": 0}
  };

  #colorsByVariable = {
    'domestic': ['#20333a', '#20525e', '#207284', '#2193ac', '#21b6d5', '#21daff'],
    'industry': ['#322531', '#4d304c', '#693b67', '#864683', '#a451a0', '#c25dbd'],
    'irrigation': ['#2f3926', '#3c5421', '#486f1c', '#568b17', '#64a912', '#72c70c'],
    'livestock': ['#383726', '#524e21', '#6e671d', '#8a8017', '#a89c13', '#c7b70e'],
    'total': ['#1f2638', '#20315c', '#213c82', '#2249ab', '#2254d4', '#2160ff']
  };

  #onStatisticField;

  #statType;
  get statType() {
    return this.#statType;
  }

  set statType(value) {
    this.#statType = value;
    this.updateStatsField();
    this.updateViz();
  }

  #variable;
  get variable() {
    return this.#variable;
  }

  set variable(value) {
    this.#variable = value;
    this.updateStatsField();
    this.updateViz();
  }

  #yearMin;
  #yearOffset;
  #year;
  set year(value) {
    this.#year = value;
    this.#yearOffset = (this.#year - this.#yearMin);
    this.fieldNameLabel.innerHTML = this.valueExpressionTitle;
    this.updateViz();
  }

  get valueExpressionTitle() {
    return `${ this.#variable } water ${ this.#statType } in ${ this.#yearMin + this.#yearOffset } (m/m2)`;
  }

  get valueExpression() {
    return `Number(Split($feature.${ this.#onStatisticField },'|')[${ this.#yearOffset }])`;
  }

  /**
   *
   * @param {HTMLElement|string} container
   * @param {MapView} view
   * @param {FeatureLayer} featureLayer
   * @param {string} defaultVariable
   * @param {string} defaultStatType
   * @param {number} minScale
   * @param {number} maxScale
   */
  constructor({container, view, featureLayer, defaultVariable, defaultStatType, minScale, maxScale}) {
    super();

    // CONTAINER //
    this.container = (container instanceof HTMLElement) ? container : document.getElementById(container);

    // VIEW //
    this.#view = view;
    // FEATURE LAYER //
    this.#featureLayer = featureLayer;

    this.#minScale = minScale;
    this.#maxScale = maxScale;

    this.#statType = defaultStatType;
    this.#variable = defaultVariable;
    this.#onStatisticField = `${ this.#variable }_${ this.#statType }`;

    this.#yearMin = this.#year = 1980;
    this.#yearOffset = 0;

    this.#enabled = true;

    // VALUE FORMATTER //
    this.valueFormatter = new Intl.NumberFormat('default', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {}
        :host .sum-label {
          font-size: 17pt;
          font-weight: 600;
        }        
      </style>
      <calcite-block heading="${ this.#featureLayer.title || "Feature Layer Statistics" }" description="all features within the current view" collapsible open>                
        <calcite-label layout="inline-space-between">
          <span>sum of <span class="field-name-label"></span></span><span class="sum-label">---</span>
        </calcite-label>                                 
      </calcite-block>   
    `;

    this.container?.append(this);
  }

  /**
   *
   */
  connectedCallback() {

    this.sumLabel = this.shadowRoot.querySelector('.sum-label');
    this.fieldNameLabel = this.shadowRoot.querySelector('.field-name-label');

    this.#featureLayer.load().then(() => {

      /**
       * TODO: CONFIGURE OTHER LAYER SETTINGS HERE
       *       - MIN/MAX SCALE
       *       - FIELDS: CONFIGURE THE DESIRED FIELDS TO BE LOADED BY DEFAULT
       */
      this.#featureLayer.set({
        minScale: this.#minScale,
        maxScale: this.#maxScale,
        outFields: this.#statisticsFieldNames
      });

      // INITIALIZE //
      this._initialize();

      // INITIAL RENDERER UPDATE //
      this._updateRenderer();

    });

  }

  /**
   *
   */
  clearLabels() {
    this.sumLabel.innerHTML = '---';
  }

  /**
   *
   * @private
   */
  _initialize() {
    require([
      'esri/core/reactiveUtils',
      'esri/core/promiseUtils',
      'esri/smartMapping/statistics/summaryStatistics'
    ], (reactiveUtils, promiseUtils, summaryStatistics) => {

      const _handleAbortErrors = error => { !promiseUtils.isAbortError(error) && console.error(error); };

      // LAYERVIEW //
      this.#view.whenLayerView(this.#featureLayer).then(layerView => {

        // SUSPENDED //
        reactiveUtils.watch(() => layerView.suspended, suspended => {
          suspended && this.clearLabels();
        }, {initial: true});

        // NOT SUSPENDED | NOT UPDATING //
        let abortController;
        this.updateViz = () => {
          if (!layerView.suspended) {
            reactiveUtils.whenOnce(() => !layerView.updating).then(() => {
              abortController?.abort();
              abortController = new AbortController();

              this._updateRenderer();
              this._updateSumStats({signal: abortController.signal}).catch(_handleAbortErrors);

            }, {initial: true});
          } else {
            this.clearLabels();
          }
        };

        /**
         * https://developers.arcgis.com/javascript/latest/api-reference/esri-smartMapping-statistics-summaryStatistics.html
         */
        this._updateSumStats = ({signal}) => {
          return summaryStatistics({
            view: this.#view,
            layer: this.#featureLayer,
            valueExpression: this.valueExpression,
            useFeaturesInView: true,
            signal
          }).then((stats) => {
            if (!signal.aborted) {
              this.sumLabel.innerHTML = this.valueFormatter.format(stats.sum);
            }
          });
        };

        // UPDATE STATISTICS FIELD //
        this.updateStatsField = () => {
          this.#onStatisticField = `${ this.#variable }_${ this.#statType }`;
          this.fieldNameLabel.innerHTML = this.valueExpressionTitle;
        };
        this.updateStatsField();

        // WHEN STATIONARY //
        reactiveUtils.when(() => this.#view.stationary, () => {
          this.updateViz();
        }, {initial: true});

      });
    });
  }

  /**
   *
   * @private
   */
  _updateRenderer() {



    // MIN REPRESENTS THE PREDEFINED CUTOFFS //
    let {cutoff, precision, stdevCount} = this.#variableInfos[this.#onStatisticField];
    // USE THE STATISTICAL AVG MAX AND STDDEV //
    let {min, avg, max, stddev} = this.#variableStats[this.#onStatisticField];

    //
    // Q: DO WE USE THE MIN FROM THE STATS (ALWAYS ZERO) OR THE PREDETERMINED CUTOFF/MIN?
    //
    min = cutoff;

    const stdDevValues = {
      avgMinus: Math.max(avg - (stddev * stdevCount), min),
      average: avg,
      avgPlus: Math.min(avg + (stddev * stdevCount), max)
    };

    const valueStops = [
      {
        label: (stdDevValues.avgMinus > min)
          ? `-${ stdevCount } stdev: ${ stdDevValues.avgMinus.toFixed(precision) }`
          : `min: ${ stdDevValues.avgMinus.toFixed(precision) }`,
        value: stdDevValues.avgMinus,
        color: this.#colorsByVariable[this.#variable].at(0)
      },
      {
        label: `average: ${ stdDevValues.average.toFixed(precision) }`,
        value: stdDevValues.average,
        color: this.#colorsByVariable[this.#variable].at(2)
      },
      {
        label: (stdDevValues.avgPlus < max)
          ? `+${ stdevCount } stdev: ${ stdDevValues.avgPlus.toFixed(precision) }`
          : `max: ${ stdDevValues.avgPlus.toFixed(precision) }`,
        value: stdDevValues.avgPlus,
        color: this.#colorsByVariable[this.#variable].at(-1)
      }
    ];

    // OPACITY STOPS //
    let opacityStops = [
      {value: stdDevValues.avgMinus, opacity: 0.70},
      {value: stdDevValues.avgPlus, opacity: 0.95}
    ];

    const waterGapRenderer = {
      type: 'simple',
      symbol: {
        type: 'simple-fill',
        color: 'transparent', //'rgba(255,255, 255,0.5)',
        outline: {
          width: 0.1,
          color: 'rgba(127,127,127,0.2)' // this.#colorRampByVariable[this.#variable][0]
        }
      },
      defaultSymbol: {
        type: 'simple-fill',
        color: 'rgba(127,127, 127,0.5)',
        outline: {
          width: 0.5,
          color: 'rgba(127,127, 127,0.9)'
        }
      },
      visualVariables: [
        {
          type: 'color',
          valueExpressionTitle: this.valueExpressionTitle,
          valueExpression: this.valueExpression,
          stops: valueStops
        },
        {
          type: 'opacity',
          valueExpression: this.valueExpression,
          stops: opacityStops,
          legendOptions: {
            showLegend: false
          }
        }
      ]
    };

    this.#featureLayer.set({
      renderer: waterGapRenderer,
      popupTemplate: {
        title: this.valueExpressionTitle,
        content: [
          {
            type: 'text',
            text: '<b>{expression/water_gap_value}</b>'
          }
        ],
        expressionInfos: [
          {
            name: "water_gap_value",
            expression: `
              var val = Round(${ this.valueExpression },${ precision });                  
              return When(val > 0, val + " m/m2", "${ FeatureLayerStats.NO_DATA_MESSAGE }");
            `
          }
        ]
      }
    });

  }

}

customElements.define("apl-feature-layer-stats", FeatureLayerStats);

export default FeatureLayerStats;
