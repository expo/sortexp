/**
 * @providesModule makeSharedListDataStore
 */
'use strict';

import { combineReducers, createStore } from 'redux';
import reinsert from './reinsert';

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

const autoScrollingReducer = defaultReducer({
  DEFAULT(state = false) {
    return state;
  },

  START_SORTING(state, action) {
    return false
  },

  STOP_SORTING(state, action) {
    return false;
  },

  START_AUTO_SCROLLING(state, action) {
    return true;
  },

  STOP_AUTO_SCROLLING(state, action) {
    return false;
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

function toObjectByRowId(order) {
  return _.reduce(order, (result, rowId, i) => {
    result[rowId] = i + 1;
    return result;
  }, {});
}

const labelReducer = defaultReducer({
  DEFAULT(state = {format: 'bullet', textByRowId: {}}) {
    return state;
  },

  SET_LABEL_FORMAT(state, action) {
    return {
      ...state,
      format: action.labelFormat,
    };
  },

  SET_ORDER(state, action) {
    // if we are currently sorting then this would need to behave
    // differently, but don't care about this case right now
    let { order } = action;
    let textByRowId = toObjectByRowId(order);

    return {
      ...state,
      order,
      textByRowId,
    };
  },

  START_SORTING(state, action) {
    return {
      ...state,
      activeRowId: action.activeRowId,
    };
  },

  SET_HOVERED_ROW_ID(state, action) {
    if (state.labelFormat === 'bullet') {
      return state;
    }

    let temporaryOrder = reinsert(
      state.order,
      state.order.indexOf(state.activeRowId),
      state.order.indexOf(action.hoveredRowId) + 1,
    );

    let textByRowId = toObjectByRowId(temporaryOrder);

    return {
      ...state,
      textByRowId,
    };
  },

  STOP_SORTING(state, action) {
    return state;
  },
});

module.exports = () => {
  return createStore(combineReducers({
    hoveredRowId: hoverReducer,
    activeItemState: activeItemReducer,
    labelState: labelReducer,
    isAutoScrolling: autoScrollingReducer,
  }));
}
