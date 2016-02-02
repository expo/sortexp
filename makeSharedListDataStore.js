/**
 * @providesModule makeSharedListDataStore
 */
'use strict';

import { combineReducers, createStore } from 'redux';

const defaultReducer = (reductions) => (state, action, ...rest) => (
  (reductions[action.type] || reductions.DEFAULT)(state, action, ...rest)
);

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

export default () => {
  return createStore(combineReducers({
    hoveredRowId: hoverReducer,
    activeItemState: activeItemReducer,
  }));
}
