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
    'domestic_demand': {min: 0.01, max: 180.0, precision: 2},
    'domestic_gap': {min: 0.0001, max: 16.0, precision: 4},
    'industry_demand': {min: 0.05, max: 520.0, precision: 2},
    'industry_gap': {min: 0.0001, max: 60.0, precision: 4},
    'irrigation_demand': {min: 0.05, max: 1900.0, precision: 2},
    'irrigation_gap': {min: 0.0001, max: 240.0, precision: 4},
    'livestock_demand': {min: 0.001, max: 9.2, precision: 3},
    'livestock_gap': {min: 0.0001, max: 1.4, precision: 4},
    'total_demand': {min: 0.05, max: 1920.0, precision: 2},
    'total_gap': {min: 0.05, max: 250.0, precision: 3}
  };

  colorRampByVariable = {
    'total': ['#1f2638', '#2160ff'],
    'domestic': ['#20333a', '#21daff'],
    'irrigation': ['#2f3926', '#72c70c'],
    'livestock': ['#383726', '#c7b70e'],
    'industry': ['#322531', '#c25dbd']
  };

  colorsByVariable = {
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
    this.updateStatsRenderer();
  }

  #variable;
  get variable() {
    return this.#variable;
  }

  set variable(value) {
    this.#variable = value;
    this.updateStatsField();
    this.updateStatsRenderer();
  }

  #yearMin;
  #yearOffset;
  #year;
  set year(value) {
    this.#year = value;
    this.#yearOffset = (this.#year - this.#yearMin);
    this.fieldNameLabel.innerHTML = this.valueExpressionTitle;
    this.updateStatsRenderer();
  }

  get valueExpressionTitle() {
    //const fieldLabel = this.#featureLayer.getField(this.#onStatisticField).alias;
    return `${ this.#variable } water ${ this.#statType } in ${ this.#yearMin + this.#yearOffset }`;
  }

  get valueExpression() {
    return `Number(Split($feature.${ this.#onStatisticField },'|')[${ this.#yearOffset }])`;
  }

  /**
   *
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

    this.#yearMin = this.#year = 1980;
    this.#yearOffset = 0;

    this.#enabled = true;

    // VALUE FORMATTER //
    this.valueFormatter = new Intl.NumberFormat('default', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style>
        :host {}
        :host .sum-label{
          font-size: 13pt;
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
       * TODO: CONFIGURE ALL OTHER LAYER SETTINGS HERE
       *       - MIN/MAX SCALE
       *       - FIELDS: CONFIGURE THE DESIRED FIELDS TO BE LOADED BY DEFAULT
       */

      this.#featureLayer.set({
        minScale: this.#minScale,
        maxScale: this.#maxScale,
        outFields: this.#statisticsFieldNames
      });

      this._initialize();
    });

  }

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
      'esri/smartMapping/statistics/summaryStatistics',
      'esri/smartMapping/renderers/color'
    ], (reactiveUtils, promiseUtils, summaryStatistics, colorRendererCreator) => {

      const _handleAbortErrors = error => { !promiseUtils.isAbortError(error) && console.error(error); };

      // LAYERVIEW //
      this.#view.whenLayerView(this.#featureLayer).then(layerView => {

        // SUSPENDED //
        reactiveUtils.watch(() => layerView.suspended, suspended => {
          suspended && this.clearLabels();
        }, {initial: true});

        // NOT SUSPENDED | NOT UPDATING //
        let abortController;
        this.updateStatsRenderer = () => {
          if (!layerView.suspended) {
            reactiveUtils.whenOnce(() => !layerView.updating).then(() => {
              abortController?.abort();
              abortController = new AbortController();
              this._updateStatsRenderer({signal: abortController.signal}).catch(_handleAbortErrors);
            }, {initial: true});
          } else {
            this.clearLabels();
          }
        };

        /**
         *
         */
        this._updateStatsRenderer = ({signal}) => {
          return new Promise((resolve, reject) => {
            summaryStatistics({
              view: this.#view,
              layer: this.#featureLayer,
              valueExpression: this.valueExpression,
              useFeaturesInView: true,
              signal
            }).then((stats) => {
              if (!signal.aborted) {
                //console.info(this.#featureLayer.title, stats);

                this.sumLabel.innerHTML = this.valueFormatter.format(stats.sum);

                // UPDATE RENDERER //
                this._updateRenderer();

                resolve();
              }
            }).catch(reject);
          });
        };

        /**
         * UPDATE RENDERER
         *
         * @private
         */
        this._updateRenderer = () => {

          /*const colorVV = this.#featureLayer.renderer.visualVariables.find(vv => vv.type === 'color');
           colorVV.set({
           valueExpressionTitle: this.valueExpressionTitle,
           valueExpression: this.valueExpression,
           legendOptions: {
           title: this.valueExpressionTitle
           }/!*,
           stops: colorVV.stops.map((colorStop, colorStopIdx) => {
           const stopValue = (stats.min + ((stats.max - stats.min) * (colorStopIdx / colorVV.stops.length)));
           colorStop.value = stopValue;
           (colorStopIdx % 2 === 0) && (colorStop.label = stopValue.toFixed(2));
           return colorStop;
           })*!/
           });*/

          /*this.#featureLayer.renderer.visualVariables = [
           {
           type: 'color',
           valueExpressionTitle: this.valueExpressionTitle,
           valueExpression: this.valueExpression,
           legendOptions: {
           title: this.valueExpressionTitle
           }
           }
           ];*/

          /*stops: [
           {
           label: `+half stdev - ${ stopValues.avgPlus.toFixed(6) }`,
           value: stopValues.avgPlus,
           color: [0, 110, 255]
           },
           {
           label: `average - ${ stopValues.average.toFixed(6) }`,
           value: stopValues.average,
           color: [191, 233, 255]
           },
           {
           label: `-half stdev - ${ stopValues.avgMinus.toFixed(6) }`,
           value: stopValues.avgMinus,
           color: [0, 110, 255]
           }
           ]*/

          /*const stopValues = {
           avgMinus: stats.avg - (stats.stddev * 0.5),
           average: stats.avg,
           avgPlus: stats.avg + (stats.stddev * 0.5)
           };*/

          const {min, max, precision} = this.#variableInfos[this.#onStatisticField];

          const waterGapRenderer = {
            type: 'simple',
            symbol: {
              type: 'simple-fill',
              color: 'rgba(255,255, 255,0.5)',
              outline: {
                width: 0.2,
                color: this.colorRampByVariable[this.#variable][0]
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
                stops: [
                  {
                    label: `${ min.toFixed(precision) }`,
                    value: min,
                    color: this.colorRampByVariable[this.#variable][0]
                  },
                  {
                    label: `${ max.toFixed(precision) }`,
                    value: max,
                    color: this.colorRampByVariable[this.#variable][1]
                  }
                ]
              },
              {
                type: 'opacity',
                valueExpression: this.valueExpression,
                stops: [
                  {value: min, opacity: 0.75},
                  {value: max, opacity: 0.90}
                ],
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
              content: '<b>{expression/water_gap}</b> mm/m3',
              expressionInfos: [{
                name: "water_gap",
                expression: this.valueExpression
              }]
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
          this.updateStatsRenderer();
        }, {initial: true});

        // INITIAL UPDATE //
        this._updateRenderer();

      });
    });
  }

}

customElements.define("apl-feature-layer-stats", FeatureLayerStats);

export default FeatureLayerStats;
