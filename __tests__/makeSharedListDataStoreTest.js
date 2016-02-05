'use strict';

jest.autoMockOff();

const makeSharedListDataStore = require('makeSharedListDataStore');
const _ = require('lodash');

describe('makeSharedListDataStore', () => {

  it('initializes with bullet format', () => {
    let store = makeSharedListDataStore();
    expect(labelFormat(store)).toEqual('bullet');
  });

  it('updates text when moving up correctly', () => {
    let store = initializeStore();
    store.dispatch({
      type: 'START_SORTING',
      activeRowId: 'id-3',
    });

    // This is row #2, row #1 is when hoveredRowId is HEADER_ROW_ID
    store.dispatch({
      type: 'SET_HOVERED_ROW_ID',
      hoveredRowId: 'id-0',
    });

    // Before:
    // id-0, id-1, id-2, id-3, id-4
    //   1     2     3    4      5
    //
    // After:
    // id-0, id-3, id-1, id-2, id-4
    //   1     2     3    4      5
    expect(textByRowId(store)['id-0']).toEqual(1);
    expect(textByRowId(store)['id-3']).toEqual(2);
    expect(textByRowId(store)['id-1']).toEqual(3);
    expect(textByRowId(store)['id-2']).toEqual(4);
    expect(textByRowId(store)['id-4']).toEqual(5);
  });

  it('updates text when moving down correctly', () => {
    let store = initializeStore();
    store.dispatch({
      type: 'START_SORTING',
      activeRowId: 'id-2',
    });

    // This is row #2, row #1 is when hoveredRowId is HEADER_ROW_ID
    store.dispatch({
      type: 'SET_HOVERED_ROW_ID',
      hoveredRowId: 'id-4',
    });

    // Before:
    // id-0, id-1, id-2, id-3, id-4
    //   1     2     3    4      5
    //
    // After:
    // id-0, id-1, id-3, id-4, id-2
    //   1     2     3    4      5
    expect(textByRowId(store)['id-0']).toEqual(1);
    expect(textByRowId(store)['id-1']).toEqual(2);
    expect(textByRowId(store)['id-3']).toEqual(3);
    expect(textByRowId(store)['id-4']).toEqual(4);
    expect(textByRowId(store)['id-2']).toEqual(5);
  });

});

function labelFormat(store) {
  return store.getState().labelState.format;
}

function textByRowId(store) {
  return store.getState().labelState.textByRowId;
}

const defaultOrder = ['id-0', 'id-1', 'id-2', 'id-3', 'id-4'];

function initializeStore() {
  let store = makeSharedListDataStore();
  store.dispatch({
    type: 'SET_ORDER',
    order: defaultOrder.slice(),
  });
  return store;
}
