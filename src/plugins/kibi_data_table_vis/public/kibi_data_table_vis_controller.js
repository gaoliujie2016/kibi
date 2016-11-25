define(function (require) {
  const module = require('ui/modules').get('kibana/kibi_data_table_vis', ['kibana']);
  const _ = require('lodash');

  require('ui/kibi/directives/kibi_param_entity_uri');
  require('ui/kibi/kibi_doc_table/kibi_doc_table');

  module.controller(
    'KibiDataTableVisController',
    function ($rootScope, $scope, kibiState, Private, getAppState, courier) {
      const urlHelper = Private(require('ui/kibi/helpers/url_helper'));
      const filterManager = Private(require('ui/filter_manager'));
      const configMode = urlHelper.onVisualizeTab();

      $scope.queryColumn = {};
      $scope.cellClickHandlers = {};
      $scope.savedObj = {
        columns: $scope.vis.params.columns,
        sort: $scope.vis.params.sort
      };

      // NOTE: filter to enable little icons in doc-viewer to filter and add/remove columns
      $scope.filter = function (field, value, operator) {
        //here grab the index
        var index = $scope.searchSource.get('index').id;
        filterManager.add(field, value, operator, index);
      };

      const _constructCellOnClicksObject = function () {
        $scope.cellClickHandlers = {};
        _.each($scope.vis.params.clickOptions, function (clickHandler) {
          if (!$scope.cellClickHandlers[clickHandler.columnField]) {
            $scope.cellClickHandlers[clickHandler.columnField] = [];
          }
          $scope.cellClickHandlers[clickHandler.columnField].push(clickHandler);
        });
      };
      _constructCellOnClicksObject();

      const _constructQueryColumnObject = function () {
        if ($scope.vis.params.enableQueryFields === true && $scope.vis.params.queryFieldName) {
          $scope.queryColumn = {
            name: $scope.vis.params.queryFieldName,
            queryDefinitions: $scope.vis.params.queryDefinitions,
            joinElasticsearchField: $scope.vis.params.joinElasticsearchField
          };
        } else {
          $scope.queryColumn = {};
        }
      };
      _constructQueryColumnObject();

      $scope.$listen(kibiState, 'save_with_changes', function (diff) {
        if (diff.indexOf(kibiState._properties.selected_entity) !== -1 ||
            diff.indexOf(kibiState._properties.selected_entity_disabled) !== -1 ||
            diff.indexOf(kibiState._properties.test_selected_entity) !== -1) {
          $scope.searchSource.fetchQueued();
        }
      });

      const removeGetAppStateHandler = $rootScope.$watch(getAppState, (appState) => {
        if (appState) {
          $rootScope.$listen(appState, 'save_with_changes', (diff) => {
            if (diff.indexOf('query') === -1 && diff.indexOf('filters') === -1) {
              return;
            }
            const currentDashboard = kibiState._getCurrentDashboardId();
            if (!currentDashboard) {
              return;
            }

            courier.fetch();
          });
        }
      });

      const removeAutorefreshHandler = $rootScope.$on('courier:searchRefresh', (event) => {
        const currentDashboard = kibiState._getCurrentDashboardId();
        if (!currentDashboard) {
          return;
        }

        $scope.searchSource.fetchQueued();
      });

      $scope.$on('$destroy', function () {
        removeGetAppStateHandler();
        removeAutorefreshHandler();
      });

      if (configMode) {
        const removeVisStateChangedHandler = $rootScope.$on('kibi:vis:state-changed', function () {
          _constructQueryColumnObject();
          _constructCellOnClicksObject();
          $scope.searchSource.fetchQueued();
        });

        const removeVisColumnsChangedHandler = $rootScope.$on('kibi:vis:columns-changed', function (event, columns) {
          if (columns) {
            $scope.savedObj.columns = columns;
          }
        }, true);

        $scope.$on('$destroy', function () {
          removeVisStateChangedHandler();
          removeVisColumnsChangedHandler();
        });

        $scope.$watch('savedObj.columns', function () {
          $rootScope.$emit('kibi:vis:savedObjectColumns-changed', $scope.savedObj);
        });

      }

    });
});
