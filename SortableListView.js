import React, {
  Animated,
  LayoutAnimation,
  ListView,
  PanResponder,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import SortableListRow from './SortableListRow';
import SortableListGhostRow from './SortableListGhostRow';
import makeSharedListDataStore from 'makeSharedListDataStore';

const SCROLL_LOWER_BOUND = 100;
const SCROLL_MAX_CHANGE = 15;

const DEBUG_GESTURE = false;
const DEBUG_SORT_EVENTS = false;

const SortableListView = React.createClass({
  /*
   * Keep track of layouts of each row
   */
  _layoutMap: {},

  /*
   * Keep track of the current scroll position
   */
  _mostRecentScrollOffset: 0,

  /*
   * Current y offset of the pan gesture
   */
  _dragMoveY: null,

  getInitialState() {
    let { items, order } = this.props;
    let dataSource = new ListView.DataSource({
      rowHasChanged: (r1, r2) => r1 !== r2,
    });

    return {
      dataSource: dataSource.cloneWithRows(items, order),
      panY: new Animated.Value(0),
      sharedListData: makeSharedListDataStore(),
    };
  },

  componentWillMount() {
    let onlyIfSorting = () => this._isSorting();

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: onlyIfSorting,
      onMoveShouldSetResponderCapture: onlyIfSorting,
      onMoveShouldSetPanResponder: onlyIfSorting,
      onMoveShouldSetPanResponderCapture: onlyIfSorting,

      onPanResponderGrant: () => {
        DEBUG_GESTURE && console.log('grant');
        this._isResponder = true;
        this.state.panY.setOffset(0);
        this.state.panY.setValue(0);
      },

      onPanResponderMove: (evt, gestureState) => {
        DEBUG_GESTURE && console.log('move');
        this._dragMoveY = gestureState.moveY;
        this.state.panY.setValue(gestureState.dy);
      },

      onPanResponderReject: () => {
        DEBUG_GESTURE && console.log('reject');
        this._isResponder = false;
        this._handleRowInactive();
      },

      onPanResponderTerminate: () => {
        DEBUG_GESTURE && console.log('terminate');
        this._isResponder = false;
        this._handleRowInactive();
      },

      onPanResponderRelease: () => {
        DEBUG_GESTURE && console.log('release');
        this._dragMoveY = null;
        this._isResponder = false;
        this._maybeFireOnChangeOrder();
        this._handleRowInactive();
      }
     });
  },

  componentWillReceiveProps(nextProps) {
    let { dataSource } = this.state;

    // TODO: should use immutable for this, call toArray when passing into cloneWithRows
    if (nextProps.items !== this.props.items ||
        nextProps.order !== this.props.order) {
      this.setState({
        dataSource: dataSource.cloneWithRows(nextProps.items, nextProps.order),
      });
    }
  },

  scrollTo(y) {
    this._list.getScrollResponder().scrollTo(y);
  },

  scrollWithoutAnimationTo(y) {
    this._list.getScrollResponder().scrollWithoutAnimationTo(y);
  },

  render() {
    return (
      <View style={{flex: 1}}>
        <ListView
          {...this.props}
          {...this.panResponder.panHandlers}
          ref={view => { this._list = view; }}
          dataSource={this.state.dataSource}
          onScroll={this._handleScroll}
          onLayout={this._handleListLayout}
          renderRow={(data, __unused, rowId) => this.renderRow(data, rowId)}
        />

        {this.renderGhostRow()}
      </View>
    );
  },

  renderRow(data, rowId, props = {}) {
    return (
      <SortableListRow
        {...this.props}
        key={rowId}
        onLongPress={this._handleRowActive}
        onPressOut={this._handleRowInactive}
        onRowLayout={this._handleRowLayout.bind(this, rowId)}
        panResponder={this.state.panResponder}
        rowData={data}
        rowId={rowId}
        sharedListData={this.state.sharedListData}
      />
    );
  },

  renderGhostRow() {
    return (
      <SortableListGhostRow
        key={`ghost`}
        panY={this.state.panY}
        renderRow={this.props.renderRow}
        sharedListData={this.state.sharedListData}
      />
    );
  },

  _maybeFireOnChangeOrder() {
    let sharedState = this.state.sharedListData.getState();
    let { hoveredRowId } = sharedState;
    let { activeRowId } = sharedState.activeItemState;

    if (hoveredRowId !== activeRowId) {
      this.props.onChangeOrder &&
        this.props.onChangeOrder(activeRowId, this.props.order.indexOf(hoveredRowId));
    }
  },

  _handleScroll(e) {
    this._mostRecentScrollOffset = e.nativeEvent.contentOffset.y;
    this.scrollContainerHeight = e.nativeEvent.contentSize.height;
  },

  _handleListLayout(e) {
    this._listLayout = e.nativeEvent.layout;
  },

  _handleRowLayout(rowId, e) {
    this._layoutMap[rowId] = e.nativeEvent.layout;
  },

  _getActiveItemState() {
    return this.state.sharedListData.getState().activeItemState;
  },

  _isSorting() {
    return this._getActiveItemState().isSorting;
  },

  // ?????????????????
  _scrollAnimation() {
    if (this.isMounted() && this._isSorting()) {
      if (this._dragMoveY === null) {
        return requestAnimationFrame(this._scrollAnimation);
      }

      let SCROLL_HIGHER_BOUND = this._listLayout.height - SCROLL_LOWER_BOUND;
      let MAX_SCROLL_VALUE = this.scrollContainerHeight;
      let currentScrollValue = this._mostRecentScrollOffset;
      let newScrollValue = null;

      if (this._dragMoveY < SCROLL_LOWER_BOUND && currentScrollValue > 0) {
        let PERCENTAGE_CHANGE = 1 - (this._dragMoveY / SCROLL_LOWER_BOUND);
          newScrollValue = currentScrollValue - (PERCENTAGE_CHANGE * SCROLL_MAX_CHANGE);
          if (newScrollValue < 0) newScrollValue = 0;
      }

      if (this._dragMoveY > SCROLL_HIGHER_BOUND && currentScrollValue < MAX_SCROLL_VALUE) {

        let PERCENTAGE_CHANGE = 1 - ((this._listLayout.height - this._dragMoveY) / SCROLL_LOWER_BOUND);
        newScrollValue = currentScrollValue + (PERCENTAGE_CHANGE * SCROLL_MAX_CHANGE);
        if (newScrollValue > MAX_SCROLL_VALUE) newScrollValue = MAX_SCROLL_VALUE;
      }

      if (newScrollValue !== null) {
        this._mostRecentScrollOffset = newScrollValue;
        this.scrollWithoutAnimationTo(this._mostRecentScrollOffset, 0);
      }

      this._checkTargetElement();
      setTimeout(this._scrollAnimation, 16.6);
    }
  },

  _findRowIdAtOffset(y) {
    let { order } = this.props;
    let { _layoutMap } = this;

    let heightAcc = 0;
    let rowIdx = 0;
    let rowLayout;

    // Added heights for each row until you reach the target y
    while (heightAcc < y) {
      let rowId = order[rowIdx];
      rowLayout = _layoutMap[rowId];

      // Are we somehow missing row layout? abort I guess?
      if (!rowLayout) {
        return;
      }

      // Add height to accumulator
      heightAcc += rowLayout.height;
      rowIdx = rowIdx + 1;
    }

    // Then return the rowId at that index
    return order[rowIdx - 1];
  },

  _findCurrentlyHoveredRow() {
    let { _mostRecentScrollOffset, _dragMoveY } = this;
    let absoluteDragOffsetInList = _mostRecentScrollOffset + _dragMoveY;

    return this._findRowIdAtOffset(absoluteDragOffsetInList);
  },

  /*
   * When we move the cursor we need to see what element we are hovering over.
   * If the row we are hovering over has changed, then update our state to
   * reflect that.
   */
  _checkTargetElement() {
    let { activeRowId } = this.state;
    let hoveredRowId = this.state.sharedListData.getState().hoveredRowId;
    let newHoveredRowId = this._findCurrentlyHoveredRow();

    if (hoveredRowId !== newHoveredRowId && newHoveredRowId) {
      let dividerHeight = activeRowId ? this._layoutMap[activeRowId].height : 0;
      let actionData = {
        type: 'SET_HOVERED_ROW_ID',
        hoveredRowId: newHoveredRowId,
      };

      LayoutAnimation.easeInEaseOut();
      this.state.sharedListData.dispatch(actionData);
    }
  },

  /*
   * This is called from a row when it becomes active (when it is long-pressed)
   */
  _handleRowActive({rowId, layout}) {
    this.state.panY.setValue(0);
    let dividerHeight = rowId ? this._layoutMap[rowId].height : 0;

    this.state.sharedListData.dispatch({
      activeLayout: layout,
      activeRowData: this.props.items[rowId],
      activeRowId: rowId,
      dividerHeight,
      type: 'START_SORTING',
    });

    DEBUG_SORT_EVENTS && console.log('start sorting!');

    this._list.setNativeProps({
      scrollEnabled: false,
    });
    requestAnimationFrame(() => this._scrollAnimation());
  },

  /*
   * It is possible to be in sorting state without being responder, this
   * happens when the underlying Touchable fires _handleRowActive but the
   * user doesn't move their finger, so the PanResponder never grabs
   * responder. To make sure this is always called, we fire
   * _handleRowInactive from onLongPressOut
   */
  _handleRowInactive() {
    DEBUG_SORT_EVENTS && console.log('stop sorting!');

    if (this._isSorting() && !this._isResponder) {
      DEBUG_SORT_EVENTS && console.log('got into stop sorting block!');

      this.state.sharedListData.dispatch({
        type: 'STOP_SORTING',
      });

      this._list.setNativeProps({
        scrollEnabled: true,
      });
    }
  },

});

export default SortableListView;
