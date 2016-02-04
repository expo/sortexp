import React, {
  Animated,
  Dimensions,
  ListView,
  NativeModules,
  PanResponder,
  PropTypes,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
const { UIManager } = NativeModules;
import TimerMixin from 'react-timer-mixin';

import clamp from './clamp';

import IncrementalListView from 'IncrementalListView';
import SortableListGhostRowContainer from './SortableListGhostRowContainer';
import SortableListRowContainer from './SortableListRowContainer';

import makeSharedListDataStore from 'makeSharedListDataStore';

const AUTOSCROLL_OFFSET_THRESHOLD = 100;
const SCROLL_MAX_CHANGE = 20;
const DEVICE_HEIGHT = Dimensions.get('window').height;

const DEBUG_GESTURE = false;
const DEBUG_SORT_EVENTS = false;
const DEBUG_CHANGE_ROWS = false;

const SortableListView = React.createClass({

  mixins: [TimerMixin],

  propTypes: {
    /*
     * An object where the keys are the id's of the items and the values are
     * the data. Order is specified in the `order` prop, which is an array
     * of the keys used here.
     */
    items: PropTypes.object.isRequired,

    /*
     * Callback that is provide with the `id` of the row that is being moved
     * and the new index.
     */
    onChangeOrder: PropTypes.func.isRequired,

    /*
     * An array of the keys from `items` which specifies the order
     */
    order: PropTypes.array.isRequired,

    /*
     * Should return the component instance for the given:
     * rowData, rowId, props
     *
     * If the props has the key `ghost` it means that the
     * row is being rendered to be dragged around, so you
     * probably want to display only the minimal content required
     * for that (no need for any of your touchable components or
     * that kind of thing).
     */
    renderRow: PropTypes.func.isRequired,
  },

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

  /*
   * Store refs for all of the rows in case we to imperatively make any
   * calls on them, eg: measure
   */
  _rowRefs: [],

  /*
   * The y-offset of the view from the top of the screen.
   */
  _layoutOffset: 0,

  /*
   * The height of the inner content view of the containing ScrollView
   */
  _contentHeight: 0,

  getInitialState() {
    let { items, order } = this.props;
    let dataSource = new ListView.DataSource({
      rowHasChanged: (r1, r2) => false,
    });

    return {
      dataSource: dataSource.cloneWithRows(items, order),
      initialListSize: this.props.order.length,
      panY: new Animated.Value(0),
      snapY: new Animated.Value(0),
      sharedListData: makeSharedListDataStore(),
    };
  },

  componentWillMount() {
    let onlyIfSorting = (lifecycle) => {
      DEBUG_GESTURE && console.log({
        responderLifecycle: lifecycle,
        isSorting: this._isSorting(),
      });

      return this._isSorting();
    };

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder:
        onlyIfSorting.bind(this, 'onStartShouldSetPanResponder'),
      onMoveShouldSetResponderCapture:
        onlyIfSorting.bind(this, 'onMoveShouldSetResponderCapture'),
      onMoveShouldSetPanResponder:
        onlyIfSorting.bind(this, 'onMoveShouldSetPanResponder'),
      onMoveShouldSetPanResponderCapture:
        onlyIfSorting.bind(this, 'onMoveShouldSetPanResponderCapture'),

      onPanResponderGrant: (e, gestureState) => {
        DEBUG_GESTURE && console.log('grant');
        let { activeLayout } = this._getActiveItemState();
        let { y0 } = gestureState;

        if (!activeLayout) {
          console.log('No activeLayout present in onPanResponderGrant -- ignore this on iOS');
          return;
        }

        this._isResponder = true;

        /* We need to calculate the distance from the touch to the pageY of the
         * top of the row that the touch occured, so we know later how far the
         * gesture's moveY is offset by. */
        this._initialTouchOffset = y0 - activeLayout.pageY;
        this.state.snapY.setValue(activeLayout.pageY - this._layoutOffset);
      },

      onPanResponderMove: (e, gestureState) => {
        DEBUG_GESTURE && console.log('move');
        let { moveY, dy, y0 } = gestureState;
        this._dragMoveY = moveY - this._initialTouchOffset;
        this.state.panY.setValue(dy - this._layoutOffset);
        this.state.snapY.setValue(moveY - this._initialTouchOffset - this._layoutOffset);
      },

      onPanResponderReject: () => {
        this._dragMoveY = null;
        this._isResponder = false;
        this._handleRowInactive();
      },

      onPanResponderTerminate: () => {
        DEBUG_GESTURE && console.log('terminate');
        this._dragMoveY = null;
        this._isResponder = false;
        this._handleRowInactive();
      },

      onPanResponderRelease: (e, gestureState) => {
        DEBUG_GESTURE && console.log('release');
        this._snapHoveredRow();
        this._initialTouchOffset = null;
        this._dragMoveY = null;
        this._isResponder = false;
        this._maybeFireOnChangeOrder();
        this._handleRowInactive();
      }
     });
  },

  componentWillReceiveProps(nextProps) {
    let { dataSource } = this.state;

    if (nextProps.items !== this.props.items || nextProps.order !== this.props.order) {
      this.setState({
        dataSource: dataSource.cloneWithRows(nextProps.items, nextProps.order),
      });
    }
  },

  scrollWithoutAnimationTo(y) {
    let constrainedY = clamp(y, 0, this._contentHeight);
    this._list.getScrollResponder().scrollWithoutAnimationTo(constrainedY);

    // On Android this will be updated automatically by the onScroll handler,
    // but onScroll isn't fired in response to scrollWithoutAnimationTo on
    // iOS it seems..
    this._mostRecentScrollOffset = constrainedY;
  },

  render() {
    return (
      <View style={{flex: 1}}>
        <IncrementalListView
          {...this.props}
          {...this.panResponder.panHandlers}
          ref={view => { this._list = view; }}
          initialListSize={this.state.initialListSize}
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
      <SortableListRowContainer
        {...this.props}
        key={rowId}
        ref={view => { this._rowRefs[rowId] = view; }}
        onLongPress={this._handleRowActive}
        onPressOut={this._handleRowInactive}
        onRowLayout={this._handleRowLayout.bind(this, rowId)}
        rowData={data}
        rowId={rowId}
        sharedListData={this.state.sharedListData}
      />
    );
  },

  renderGhostRow() {
    return (
      <SortableListGhostRowContainer
        key="ghost"
        panY={this.state.panY}
        snapY={this.state.snapY}
        renderRow={this.props.renderRow}
        sharedListData={this.state.sharedListData}
      />
    );
  },

  _snapHoveredRow() {
    let sharedState = this.state.sharedListData.getState();
    let { hoveredRowId } = sharedState;

    if (hoveredRowId) {
      this._rowRefs[hoveredRowId].measure(layout => {
        Animated.timing(this.state.snapY, {
          toValue: layout.pageY - this._layoutOffset, duration: 100
        }).start();
      });
    }
  },

  _maybeFireOnChangeOrder() {
    let sharedState = this.state.sharedListData.getState();
    let { hoveredRowId } = sharedState;
    let { activeRowId } = sharedState.activeItemState;

    if (hoveredRowId === null) {
      return;
    }

    if (hoveredRowId !== activeRowId) {
      DEBUG_CHANGE_ROWS && console.log({
        moveRow: activeRowId,
        toPositionAboveRow: hoveredRowId,
      });

      this.props.onChangeOrder &&
        this.props.onChangeOrder(activeRowId, this.props.order.indexOf(hoveredRowId));
    }
  },

  _handleScroll(e) {
    this._mostRecentScrollOffset = e.nativeEvent.contentOffset.y;
  },

  _handleListLayout(e) {
    if (!this._isSorting()) {
      let scrollViewHandle = React.findNodeHandle(this._list.getScrollResponder());
      let innerViewHandle = this._list.getInnerViewNode();
      let scrollFrameHeight = e.nativeEvent.layout.height;

      UIManager.measure(scrollViewHandle, (__, ___, ____, _____, ______, pageY) => {
        this._layoutOffset = pageY;
      });

      UIManager.measure(innerViewHandle, (__, ___, ____, frameHeight) => {
        this._contentHeight = Math.max(0, frameHeight - scrollFrameHeight);
      });
    }
  },

  _handleRowLayout(rowId, e) {
    if (!this._isSorting()) {
      this._layoutMap[rowId] = e.nativeEvent.layout;
    }
  },

  _getActiveItemState() {
    return this.state.sharedListData.getState().activeItemState;
  },

  _isSorting() {
    return !!this._getActiveItemState().isSorting;
  },

  _maybeAutoScroll() {
    if (!this._isSorting()) {
      return;
    }

    let { _dragMoveY } = this;
    if (_dragMoveY === null) {
      return this.requestAnimationFrame(this._maybeAutoScroll);
    }

    let currentScrollOffset = this._mostRecentScrollOffset;
    let newScrollOffset = null;
    let relativeDragMoveY = _dragMoveY - this._layoutOffset;
    let { activeLayout } = this._getActiveItemState();

    // Get the position at the bottom of the row that we're dragging -- dragMoveY
    // refers to the y position at the topmost point of the rect
    let bottomDragMoveY = _dragMoveY + activeLayout.frameHeight;

    if (relativeDragMoveY < AUTOSCROLL_OFFSET_THRESHOLD && currentScrollOffset > 0) {
      // Auto scroll up
      let percentageChange = 1 - (relativeDragMoveY / AUTOSCROLL_OFFSET_THRESHOLD);
      newScrollOffset = Math.max(0, currentScrollOffset - percentageChange * SCROLL_MAX_CHANGE);
    } else if (bottomDragMoveY > DEVICE_HEIGHT - AUTOSCROLL_OFFSET_THRESHOLD) {
      // Auto scroll down
      let percentageChange = 1 - ((DEVICE_HEIGHT - bottomDragMoveY) / AUTOSCROLL_OFFSET_THRESHOLD);
      newScrollOffset = currentScrollOffset + (percentageChange * SCROLL_MAX_CHANGE);
    }

    if (newScrollOffset !== null) {
      this.scrollWithoutAnimationTo(newScrollOffset);
    }

    this.requestAnimationFrame(this._maybeAutoScroll);
  },

  _findRowIdAtOffset(y) {
    let { order } = this.props;
    let { _layoutMap } = this;

    let relativeY = y - this._layoutOffset;
    let rowHeight = 0;
    let heightAcc = 0;
    let rowIdx = -1;
    let rowId;
    let rowLayout;

    do {
      rowIdx = rowIdx + 1;
      rowId = order[rowIdx];
      rowLayout = _layoutMap[rowId];

      if (rowLayout) {
        rowHeight = rowLayout.height;
        heightAcc = heightAcc + rowHeight;
      } else {
        rowId = order[rowIdx - 1];
        break;
      }
    } while (heightAcc <= relativeY + rowHeight);

    console.log({
      rowId,
      relativeY,
      rowId
    });

    return rowId;
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
  _maybeUpdateHoveredRow() {
    if (!this._isSorting()) {
      return;
    }

    let { activeRowId } = this._getActiveItemState();
    let hoveredRowId = this.state.sharedListData.getState().hoveredRowId;
    let newHoveredRowId = this._findCurrentlyHoveredRow();

    if (hoveredRowId !== newHoveredRowId && newHoveredRowId) {
      let dividerHeight = activeRowId ? this._layoutMap[activeRowId].height : 0;
      let actionData = {
        type: 'SET_HOVERED_ROW_ID',
        hoveredRowId: newHoveredRowId,
      };

      // LayoutAnimation does not work properly on Android, so don't use this
      // for now
      // LayoutAnimation.easeInEaseOut();

      this.state.sharedListData.dispatch(actionData);

      // TODO: update temporary ordering
      // Save hovered row as previous updated
      // Make sure that we update all numbers between that one and current one
    }

    // TODO: do this less frequently on worse devices?
    this.setTimeout(this._maybeUpdateHoveredRow, 16 * 3);
  },

  /*
   * This is called from a row when it becomes active (when it is long-pressed)
   */
  _handleRowActive({rowId, layout}) {
    if (!rowId) {
      return;
    }

    // Reset our animated values
    this.state.panY.setOffset(0);
    this.state.panY.setValue(-this._layoutOffset);
    this.state.snapY.setOffset(0);
    this.state.snapY.setValue(0);

    // We need to initialize this or it will be null and we will have some
    // problems if the user doesn't scroll
    this._dragMoveY = layout.pageY;

    this.state.sharedListData.dispatch({
      activeLayout: layout,
      activeRowData: this.props.items[rowId],
      activeRowId: rowId,
      dividerHeight: this._layoutMap[rowId].height,
      type: 'START_SORTING',
    });

    DEBUG_SORT_EVENTS && console.log('start sorting!');

    this._list.setNativeProps({
      scrollEnabled: false,
    });

    this.requestAnimationFrame(() => this._maybeAutoScroll());
    this.requestAnimationFrame(() => this._maybeUpdateHoveredRow());
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
