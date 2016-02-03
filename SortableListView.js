import React, {
  Animated,
  Dimensions,
  LayoutAnimation,
  ListView,
  PanResponder,
  PropTypes,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import TimerMixin from 'react-timer-mixin';

import IncrementalListView from 'IncrementalListView';
import SortableListGhostRow from './SortableListGhostRow';
import SortableListRow from './SortableListRow';

import makeSharedListDataStore from 'makeSharedListDataStore';

const AUTOSCROLL_OFFSET_THRESHOLD = 100;
const SCROLL_MAX_CHANGE = 15;
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

  getInitialState() {
    let { items, order } = this.props;
    let dataSource = new ListView.DataSource({
      rowHasChanged: (r1, r2) => false,
    });

    return {
      dataSource: dataSource.cloneWithRows(items, order),
      initialListSize: this.props.order.length,
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

    if (_dragMoveY < AUTOSCROLL_OFFSET_THRESHOLD && currentScrollOffset > 0) {
      // Auto scroll up
      let percentageChange = 1 - (this._dragMoveY / AUTOSCROLL_OFFSET_THRESHOLD);
      newScrollOffset = Math.max(0, currentScrollOffset - percentageChange * SCROLL_MAX_CHANGE);
    } else if (this._dragMoveY > DEVICE_HEIGHT - AUTOSCROLL_OFFSET_THRESHOLD) {
      // Auto scroll down
      let percentageChange = 1 - ((DEVICE_HEIGHT - this._dragMoveY) / AUTOSCROLL_OFFSET_THRESHOLD);
      newScrollOffset = currentScrollOffset + (percentageChange * SCROLL_MAX_CHANGE);
    }

    if (newScrollOffset !== null) {
      this._mostRecentScrollOffset = newScrollOffset;
      this.scrollWithoutAnimationTo(this._mostRecentScrollOffset);
    }

    this.requestAnimationFrame(this._maybeAutoScroll);
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
  _maybeUpdateHoveredRow() {
    if (!this._isSorting()) {
      return;
    }

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

    this.setTimeout(this._maybeUpdateHoveredRow, 16 * 3);
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
