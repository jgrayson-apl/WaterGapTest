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

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";
import SignIn from './apl/SignIn.js';
import FeaturesList from './apl/FeaturesList.js';
import ViewLoading from './apl/ViewLoading.js';
import FeatureLayerStats from './FeatureLayerStats.js';

class Application extends AppBase {

  // PORTAL //
  portal;

  constructor() {
    super();

    // LOAD APPLICATION BASE //
    super.load().then(() => {

      // APPLICATION LOADER //
      const applicationLoader = new AppLoader({app: this});
      applicationLoader.load().then(({portal, group, map, view}) => {
        //console.info(portal, group, map, view);

        // PORTAL //
        this.portal = portal;

        // VIEW SHAREABLE URL PARAMETERS //
        this.initializeViewShareable({view});

        // USER SIGN-IN //
        this.configUserSignIn();

        // SET APPLICATION DETAILS //
        this.setApplicationDetails({map, group});

        // APPLICATION //
        this.applicationReady({portal, group, map, view}).catch(this.displayError).then(() => {
          // HIDE APP LOADER //
          document.getElementById('app-loader').toggleAttribute('hidden', true);
        });

      }).catch(this.displayError);
    }).catch(this.displayError);

  }

  /**
   *
   */
  configUserSignIn() {

    const signInContainer = document.getElementById('sign-in-container');
    if (signInContainer) {
      const signIn = new SignIn({container: signInContainer, portal: this.portal});
    }

  }

  /**
   *
   * @param view
   */
  configView(view) {
    return new Promise((resolve, reject) => {
      if (view) {
        require([
          'esri/core/reactiveUtils',
          'esri/widgets/Popup',
          'esri/widgets/Home',
          'esri/widgets/Search',
          'esri/widgets/LayerList',
          'esri/widgets/Legend'
        ], (reactiveUtils, Popup, Home, Search, LayerList, Legend) => {

          // VIEW AND POPUP //
          view.set({
            constraints: {snapToZoom: false},
            highlightOptions: {
              fillOpacity: 0.01,
              haloColor: "crimson"
            },
            popup: new Popup({
              dockEnabled: true,
              dockOptions: {
                buttonEnabled: false,
                breakpoint: false,
                position: "top-right"
              }
            })
          });

          // HOME //
          const home = new Home({view});
          view.ui.add(home, {position: 'top-left', index: 0});

          // LEGEND //
          const legend = new Legend({view: view});
          view.ui.add(legend, {position: 'bottom-left', index: 0});

          // SEARCH //
          const search = new Search({view: view});
          view.ui.add(search, {position: 'top-right', index: 0});

          // LAYER LIST //
          const layerList = new LayerList({
            container: 'layer-list-container',
            view: view,
            visibleElements: {statusIndicators: true}
          });

          // VIEW LOADING INDICATOR //
          const viewLoading = new ViewLoading({view: view});
          view.ui.add(viewLoading, 'bottom-right');

          resolve();
        });
      } else { resolve(); }
    });
  }

  /**
   *
   * @param portal
   * @param group
   * @param map
   * @param view
   * @returns {Promise}
   */
  applicationReady({portal, group, map, view}) {
    return new Promise(async (resolve, reject) => {
      // VIEW READY //
      this.configView(view).then(() => {

        this.initializeWaterGapTest({view});

        resolve();
      }).catch(reject);
    });
  }

  /**
   *
   * @param view
   */
  initializeWaterGapTest({view}) {
    require([
      'esri/core/reactiveUtils',
      'esri/core/promiseUtils'
    ], (reactiveUtils, promiseUtils) => {

      const yearSlider = document.getElementById('year-slider');
      const variablesList = document.getElementById('variables-list');
      const statTypeOption = document.getElementById('stat-type-option');

      const defaultRenderingOptions = {
        defaultVariable: variablesList.value, //'total',
        defaultStatType: statTypeOption.value // 'gap'
      };

      const waterProvincesLayer = view.map.layers.find(layer => layer.title === 'Water Provinces');
      const waterProvincesStats = new FeatureLayerStats({
        container: 'huc-test-panel',
        view,
        featureLayer: waterProvincesLayer,
        minScale: 0,
        maxScale: 20000000,
        ...defaultRenderingOptions
      });

      const hydroBasinsLevel5Layer = view.map.layers.find(layer => layer.title === 'Hydrobasins Level 5');
      const hydroBasinsLevel5Stats = new FeatureLayerStats({
        container: 'huc-test-panel',
        view,
        featureLayer: hydroBasinsLevel5Layer,
        minScale: 20000000,
        maxScale: 5000000,
        ...defaultRenderingOptions
      });

      const hydroBasinsLevel7Layer = view.map.layers.find(layer => layer.title === 'Hydrobasins Level 7');
      const hydroBasinsLevel7Stats = new FeatureLayerStats({
        container: 'huc-test-panel',
        view,
        featureLayer: hydroBasinsLevel7Layer,
        minScale: 5000000,
        maxScale: 0,
        ...defaultRenderingOptions
      });

      const allLayerStats = [waterProvincesStats, hydroBasinsLevel5Stats, hydroBasinsLevel7Stats];

      variablesList.addEventListener('calciteComboboxChange', () => {
        allLayerStats.forEach(layerStats => {
          layerStats.variable = variablesList.value;
        });
      });

      statTypeOption.addEventListener('calciteSegmentedControlChange', () => {
        allLayerStats.forEach(layerStats => {
          layerStats.statType = statTypeOption.value;
        });
      });
      yearSlider.addEventListener('calciteSliderInput', () => {
        allLayerStats.forEach(layerStats => {
          layerStats.year = yearSlider.value;
        });
      });

      // HANDLE ABORT ERRORS //
      const _handleAbortErrors = error => { !promiseUtils.isAbortError(error) && console.error(error); };

      // ABORT CONTROLLER //
      let abortController;
      //
      // DISPLAY POPUP FOR FEATURE(S) AT VIEW CENTER //
      //
      reactiveUtils.when(() => view.stationary, () => {
        reactiveUtils.whenOnce(() => !view.updating).then(() => {
          abortController?.abort();
          abortController = new AbortController();
          view.popup.fetchFeatures(view.toScreen(view.center), {signal: abortController.signal}).then((response) => {
            if(!abortController.signal.aborted) {
              response.allGraphicsPromise.then((graphics) => {
                if (graphics?.length) {
                  view.popup.open({features: graphics});
                } else {
                  view.popup.close();
                }
              });
            }
          }).catch(_handleAbortErrors);
        }, {initial: true});
      }, {initial: true});

    });
  }

}

export default new Application();
