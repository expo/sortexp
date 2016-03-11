import React, {
  Animated,
  Dimensions,
  LayoutAnimation,
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
import { shallowEquals } from './ShallowEquals';

import IncrementalListView from './IncrementalListView';
import SortableListHeader from './SortableListHeader';
import SortableListGhostRowContainer from './SortableListGhostRowContainer';
import SortableListRowContainer from './SortableListRowContainer';
import Constants from './SortableListViewConstants';

const { HEADER_ROW_ID } = Constants;

import makeSharedListDataStore from './makeSharedListDataStore';

const AUTOSCROLL_OFFSET_THRESHOLD = 120;
const SCROLL_MAX_CHANGE = 25;
const DEVICE_HEIGHT = Dimensions.get('window').height;

const ENABLE_LAYOUT_ANIMATION = false;

const SortableListView = React.createClass({

  mixins: [TimerMixin],

  getDefaultProps() {
    return {
      labelFormat: 'bullet',
    };
  },

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
    onSortStart: PropTypes.func,

    /* Not implemented, might not be necessary */
    onSortEnd: PropTypes.func,

    /*
     * An array of the keys from `items` which specifies the order
     */
    order: PropTypes.array.isRequired,

    labelFormat: PropTypes.oneOf(['bullet', 'number']),

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


    placeholderRowKey: PropTypes.any.isRequired,
    placeholderRowIndex: PropTypes.number.isRequired,

    renderDivider: PropTypes.func,
    renderHeader: PropTypes.func,
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
   * Height of the ListView header
   */
  _headerHeight: 0,

  /*
   * The height of the inner content view of the containing ScrollView
   */
  _contentHeight: 0,

  getInitialState() {
    let dataSource = new ListView.DataSource({
      rowHasChanged: (r1, r2) => false,
    });

    return {
      dataSource: this._cloneWithProps(dataSource, this.props),
      initialListSize: this.props.order.length,
      panY: new Animated.Value(0),
      snapY: new Animated.Value(0),
      sharedListData: makeSharedListDataStore(),
    };
  },

  _topOfListOffset() {
    return this._headerHeight + this._layoutOffset;
  },

  componentWillMount() {
    this._updateLabelStateFromProps({nextProps: this.props, force: true});

    let onlyIfSorting = (lifecycle) => {
      return this._isSorting();
    };

    let endDrag = () => {
      this._dragMoveY = null;
      this._isResponder = false;

      this._handleRowInactive();
    };

    let release = (e, gestureState) => {
      if (this._isResponder) {
        this._snapHoveredRow();
        this._initialTouchOffset = null;
        this._dragMoveY = null;
        this._isResponder = false;
        this._maybeFireOnChangeOrder();
        this._handleRowInactive();
      }
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
        let { activeLayout } = this._getActiveItemState();
        let { y0 } = gestureState;

        if (!activeLayout) {
          console.log('No activeLayout present in onPanResponderGrant -- ignore this on iOS');
          return;
        }

        this._isResponder = true;
        this.props.onSortStart && this.props.onSortStart();

        /* We need to calculate the distance from the touch to the pageY of the
         * top of the row that the touch occured, so we know later how far the
         * gesture's moveY is offset by. */
        this._initialTouchOffset = y0 - activeLayout.pageY;
        this.state.snapY.setValue(activeLayout.pageY - this._layoutOffset);
      },

      onPanResponderMove: (e, gestureState) => {
        let { moveY, dy, y0 } = gestureState;
        this._dragMoveY = moveY - this._initialTouchOffset;
        let panY = dy - this._layoutOffset;
        let snapY = moveY - this._initialTouchOffset - this._layoutOffset;
        this.state.panY.setValue(panY);
        this.state.snapY.setValue(snapY);
      },

      onPanResponderReject: endDrag,
      onPanResponderTerminate: endDrag,
      onPanResponderEnd: release,
      onPanResponderRelease: release,

      onResponderTerminationRequest: () => {
        return !this._isSorting();
      },
     });
  },

  componentWillReceiveProps(nextProps) {
    this._updateLabelStateFromProps({nextProps});
    if (nextProps.items !== this.props.items || nextProps.order !== this.props.order) {
      let { dataSource } = this.state;

      this.setState({
        dataSource: this._cloneWithProps(dataSource, nextProps),
      });
    }
  },

  _cloneWithProps(dataSource, props) {
    // insert placeholder row id in order
    // insert {} for rowData

    let order = props.order.slice();
    order.splice(props.placeholderRowIndex, 0, props.placeholderRowKey);
    let items = {...props.items, [props.placeholderRowKey]: {}};
    return dataSource.cloneWithRows(items, order);
  },

  _updateLabelStateFromProps({nextProps, force}) {
    if (force ||
        nextProps.labelFormat !== this.props.labelFormat ||
        !shallowEquals(nextProps.order, this.props.order)) {
      this.state.sharedListData.dispatch({
        type: 'SET_LABEL_FORMAT',
        labelFormat: nextProps.labelFormat,
      });

      this.state.sharedListData.dispatch({
        type: 'SET_ORDER',
        order: nextProps.order,
      });
    }
  },

  scrollWithoutAnimationTo(y) {
    let constrainedY = clamp(y, 0, this._contentHeight);
    this._list.getScrollResponder().scrollTo({y: constrainedY, x: 0, animated: false});
    // this._list.getScrollResponder().scrollWithoutAnimationTo(constrainedY);

    // On Android this will be updated automatically by the onScroll handler,
    // but onScroll isn't fired in response to scrollWithoutAnimationTo on
    // iOS it seems..
    this._mostRecentScrollOffset = constrainedY;
  },

  getScrollResponder() {
    return this._list.getScrollResponder();
  },

  render() {
    return (
      <View style={{flex: 1}}>
        <IncrementalListView
          {...this.props}
          {...this.panResponder.panHandlers}
          ref={view => { this._list = view; }}
          initialListSize={this.state.initialListSize || 10 /* TODO: fix this dumb hack */ }
          dataSource={this.state.dataSource}
          onScroll={this._handleScroll}
          onLayout={this._handleListLayout}
          renderHeader={this.renderHeader}
          renderRow={(data, __unused, rowId) => this.renderRow(data, rowId)}
        />

        {this.renderGhostRow()}
      </View>
    );
  },

  scrollTo(options) {
    this._list.scrollTo(options.y);
  },

  renderHeader() {
    return (
      <SortableListHeader
        onLayout={this._handleHeaderLayout}
        renderHeader={this.props.renderHeader}
        renderDivider={this.renderDivider}
        sharedListData={this.state.sharedListData}
      />
    );
  },

  renderDivider() {
    let { dividerHeight } = this._getActiveItemState();

    if (this.props.renderDivider) {
      return this.props.renderDivider(dividerHeight);
    } else {
      return (
        <View style={{height: dividerHeight}} key="divider" />
      );
    }
  },

  renderRow(data, rowId, props = {}) {
    var isPlaceholder = rowId === this.props.placeholderRowKey;

    return (
      <SortableListRowContainer
        {...this.props}
        key={rowId}
        isPlaceholder={isPlaceholder}
        ref={view => { this._rowRefs[rowId] = view; }}
        onLongPress={this._handleRowActive}
        onPressOut={this._handleRowInactive}
        onRowLayout={this._handleRowLayout.bind(this, rowId)}
        renderDivider={this.renderDivider}
        rowData={data}
        rowId={rowId}
        sharedListData={this.state.sharedListData}
      />
    );
  },

  renderGhostRow() {
    // TODO: add labelFormat and labelText

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
    let activeItemState = this._getActiveItemState();
    let { hoveredRowId } = sharedState;
    let snapToRowId = hoveredRowId;

    if (hoveredRowId === HEADER_ROW_ID) {
      snapToRowId = this.props.order[0];
    }

    if (snapToRowId) {
      this._rowRefs[snapToRowId].measure(layout => {
        let targetY = layout.pageY - this._layoutOffset;

        if (hoveredRowId === HEADER_ROW_ID) {
          targetY = targetY - activeItemState.dividerHeight;
        } else if (snapToRowId !== activeItemState.activeRowId) {
          targetY = targetY + activeItemState.dividerHeight;
        }

        Animated.timing(this.state.snapY, {
          toValue: targetY,
          duration: 150,
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
      let newRowIndex;

      if (hoveredRowId === HEADER_ROW_ID) {
        newRowIndex = 0;
      } else {
        newRowIndex = this.props.order.indexOf(hoveredRowId) + 1;
      }

      this.props.onChangeOrder && this.props.onChangeOrder(activeRowId, newRowIndex);
    }
  },

  _handleScroll(e) {
    this._mostRecentScrollOffset = e.nativeEvent.contentOffset.y;
  },

  _handleHeaderLayout(e) {
    this._headerHeight = e.nativeEvent.layout.height;
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
    this._layoutMap[rowId] = e.nativeEvent.layout;
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

    let { activeLayout, dividerHeight } = this._getActiveItemState();
    let currentScrollOffset = this._mostRecentScrollOffset;
    let newScrollOffset = null;

    // We should scroll faster in longer lists... but cap that too
    let contextualScrollMaxChange = clamp(
      SCROLL_MAX_CHANGE * (this._contentHeight / 1000),
      SCROLL_MAX_CHANGE,
      SCROLL_MAX_CHANGE * 3,
    );

    // Get the position at the top and bottom of the row that we're dragging --
    // dragMoveY refers to the y position at the topmost point of the rect
    let topDragMoveY = _dragMoveY + activeLayout.frameHeight - this._layoutOffset;
    let bottomDragMoveY = _dragMoveY + activeLayout.frameHeight;

    if (topDragMoveY < AUTOSCROLL_OFFSET_THRESHOLD && currentScrollOffset > 0) {
      // Auto scroll up
      let percentageChange = 1 - (topDragMoveY / AUTOSCROLL_OFFSET_THRESHOLD);
      newScrollOffset = Math.max(0, currentScrollOffset - Math.max(15, percentageChange * contextualScrollMaxChange));
    } else if (bottomDragMoveY > DEVICE_HEIGHT - AUTOSCROLL_OFFSET_THRESHOLD) {
      // Auto scroll down
      let percentageChange = 1 - ((DEVICE_HEIGHT - bottomDragMoveY) / AUTOSCROLL_OFFSET_THRESHOLD);
      newScrollOffset = currentScrollOffset + Math.max(15, (percentageChange * contextualScrollMaxChange));
    }

    if (newScrollOffset === null) {
      this._isAutoScrolling() &&
        this.state.sharedListData.dispatch({type: 'STOP_AUTO_SCROLLING'});
    } else {
      this.scrollWithoutAnimationTo(newScrollOffset);
      !this._isAutoScrolling() &&
        this.state.sharedListData.dispatch({type: 'START_AUTO_SCROLLING'});
    }

    this.requestAnimationFrame(this._maybeAutoScroll);
  },

  _isAutoScrolling() {
    return this.state.sharedListData.getState().isAutoScrolling;
  },

  _findRowIdAtOffset(y) {
    let { order } = this.props;
    let { _layoutMap } = this;

    let relativeY = y - this._topOfListOffset();
    let rowHeight = 0;
    let heightAcc = 0;
    let rowIdx = -1;
    let rowLayout;

    do {
      rowIdx = rowIdx + 1;
      rowLayout = _layoutMap[order[rowIdx]];

      // Hit the end of the list
      if (!rowLayout) {
        return order[rowIdx -1];
      }

      // Is the user trying to drag something above the first row? Special case to
      // add a divider to the header
      if (heightAcc === 0 && relativeY < Math.max(10, rowLayout.height / 10)) {
        return HEADER_ROW_ID;
      }

      rowHeight = rowLayout.height;
      heightAcc += rowHeight;
    } while (heightAcc <= relativeY - rowLayout.height / 2);

    return order[rowIdx];
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
      let actionData = {
        type: 'SET_HOVERED_ROW_ID',
        hoveredRowId: newHoveredRowId,
      };

      if (ENABLE_LAYOUT_ANIMATION) {
        UIManager.setLayoutAnimationEnabledExperimental &&
          UIManager.setLayoutAnimationEnabledExperimental(true);

        LayoutAnimation.easeInEaseOut();

        requestAnimationFrame(() => {
          UIManager.setLayoutAnimationEnabledExperimental &&
            UIManager.setLayoutAnimationEnabledExperimental(false);
        });
      }

      this.state.sharedListData.dispatch(actionData);
    }

    // TODO: do this less frequently on worse devices?
    this.setTimeout(this._maybeUpdateHoveredRow, 16.6 * 2);
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
    if (this._isSorting() && !this._isResponder) {
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
