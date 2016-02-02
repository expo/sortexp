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
    return action.hoveredRowId;
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
      dividerHeight: action.dividerHeight,
    };
  },

  STOP_SORTING(state, action) {
    return {};
  },

  SET_ACTIVE_ITEM(state, action) {
    return {
      activeRowId: action.activeRowId,
      dividerHeight: action.dividerHeight,
    };
  },
});

export default () => {
  return createStore(combineReducers({
    hoverRowId: hoverReducer,
    activeItemState: activeItemReducer,
  }));
}
