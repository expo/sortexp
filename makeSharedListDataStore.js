/**
 * @providesModule makeSharedListDataStore
 */
'use strict';

import { combineReducers, createStore } from 'redux';

const defaultReducer = (reductions) => (state, action, ...rest) => (
  (reductions[action.type] || reductions.DEFAULT)(state, action, ...rest)
);

const activeItemReducer = defaultReducer({
  DEFAULT(state = {}) {
    return state;
  },

  START_SORTING(state, action) {
    return {
      activeRowId: action.activeRowId,
      activeLayout: action.activeLayout,
      activeRowData: action.activeRowData,
      dividerHeight: action.dividerHeight,
      isSorting: true,
    };
  },

  STOP_SORTING(state, action) {
    return {
      ...state,
      isSorting: false,
    };
  },
});

const hoverReducer = defaultReducer({
  DEFAULT(state = null) {
    return state;
  },

  START_SORTING(state, action) {
    return action.activeRowId;
  },

  STOP_SORTING(state, action) {
    return null;
  },

  SET_HOVERED_ROW_ID(state, action) {
    return action.hoveredRowId;
  },
});

const labelReducer = defaultReducer({
  DEFAULT(state = {format: 'bullet', textByRowId: []}) {
    return state;
  },

  SET_LABEL_FORMAT(state, action) {
    return {
      ...state,
      format: action.labelFormat,
    };
  },

  SET_ORDER(state, action) {
    let textByRowId = _.reduce(action.order, (result, rowId, i) => {
      result[rowId] = i + 1;
      return result;
    }, {});

    return {
      ...state,
      textByRowId,
    };
  },

  START_SORTING(state, action) {
    // ?????
    return state;
  },

  STOP_SORTING(state, action) {
    // ?????
    return state;
  },

  SET_HOVERED_ROW_ID(state, action) {
    // ??????
    return state;
  },
});

export default () => {
  return createStore(combineReducers({
    hoveredRowId: hoverReducer,
    activeItemState: activeItemReducer,
    labelState: labelReducer,
  }));
}
