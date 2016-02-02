import React, {
  Animated,
  LayoutAnimation,
  ListView,
  PanResponder,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import Row from './Row';
import GhostRow from './GhostRow';

const SCROLL_LOWER_BOUND = 100;
const SCROLL_MAX_CHANGE = 15;

const SortableListView = React.createClass({

  /*
   * Keep track of layouts of each row
   */
  layoutMap: {},

  /*
   * Keep track of the current scroll position
   */
  mostRecentScrollOffset: 0,

  /*
   * Current y offset of the pan gesture
   */
  dragMoveY: null,

  getInitialState() {
    let { items, sortOrder } = this.props;
    let dataSource = new ListView.DataSource({
      rowHasChanged: (r1, r2) => true,
    });

    return {
      activeRowId: null,
      activeLayout: null,
      dataSource: dataSource.cloneWithRows(items, sortOrder),
      isSorting: false,
      panY: new Animated.Value(0)
    };
  },

  componentWillMount() {
    let onlyIfSorting = () => this.state.isSorting;

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: onlyIfSorting,
      onMoveShouldSetResponderCapture: onlyIfSorting,
      onMoveShouldSetPanResponder: onlyIfSorting,
      onMoveShouldSetPanResponderCapture: onlyIfSorting,

      onPanResponderGrant: () => {
        this._isResponder = true;
        this.state.panY.setOffset(0);
        this.state.panY.setValue(0);
      },

      onPanResponderMove: (evt, gestureState) => {
        this.dragMoveY = gestureState.moveY;
        this.state.panY.setValue(gestureState.dy);
      },

      onPanResponderReject: () => {
        this._isResponder = false;
      },

      onPanResponderTerminate: () => {
        this._isResponder = false;
      },

      onPanResponderRelease: () => {
        this._isResponder = false;
        this._handleRowInactive();
      }
     });
  },

  componentWillReceiveProps(nextProps) {
    // TODO: should use immutable for this, call toArray when passing into cloneWithRows
    if (nextProps.items !== this.props.items ||
        nextProps.sortOrder !== this.props.sortOrder) {
      this.setState({
        dataSource: this.state.dataSource.cloneWithRows(nextProps.items, nextProps.sortOrder),
      });
    }
  },

  componentDidMount() {
    this.scrollResponder = this._list.getScrollResponder();
  },

  // ?????????????????
  scrollAnimation() {
    if (this.isMounted() && this.state.activeRowId) {
      if (this.dragMoveY === null) {
        return requestAnimationFrame(this.scrollAnimation);
      }

      let SCROLL_HIGHER_BOUND = this.listLayout.height - SCROLL_LOWER_BOUND;
      let MAX_SCROLL_VALUE = this.scrollContainerHeight;
      let currentScrollValue = this.mostRecentScrollOffset;
      let newScrollValue = null;

      if (this.dragMoveY < SCROLL_LOWER_BOUND && currentScrollValue > 0) {
        let PERCENTAGE_CHANGE = 1 - (this.dragMoveY / SCROLL_LOWER_BOUND);
          newScrollValue = currentScrollValue - (PERCENTAGE_CHANGE * SCROLL_MAX_CHANGE);
          if (newScrollValue < 0) newScrollValue = 0;
      }

      if (this.dragMoveY > SCROLL_HIGHER_BOUND && currentScrollValue < MAX_SCROLL_VALUE) {

        let PERCENTAGE_CHANGE = 1 - ((this.listLayout.height - this.dragMoveY) / SCROLL_LOWER_BOUND);
        newScrollValue = currentScrollValue + (PERCENTAGE_CHANGE * SCROLL_MAX_CHANGE);
        if (newScrollValue > MAX_SCROLL_VALUE) newScrollValue = MAX_SCROLL_VALUE;
      }

      if (newScrollValue !== null) {
        this.mostRecentScrollOffset = newScrollValue;
        this.scrollResponder.scrollWithoutAnimationTo(this.mostRecentScrollOffset, 0);
      }

      this.checkTargetElement();
      requestAnimationFrame(this.scrollAnimation);
    }
  },

  findRowIdAtOffset(y) {
    let { sortOrder } = this.props;
    let { layoutMap } = this;

    let heightAcc = 0;
    let rowIdx = 0;
    let rowLayout;

    // Added heights for each row until you reach the target y
    while (heightAcc < y) {
      let rowId = sortOrder[rowIdx];
      rowLayout = layoutMap[rowId];

      // Are we somehow missing row layout? abort I guess?
      if (!rowLayout) {
        return;
      }

      // Add height to accumulator
      heightAcc += rowLayout.height;
      rowIdx = rowIdx + 1;
    }

    // Then return the rowId at that index
    return sortOrder[rowIdx - 1];
  },

  findCurrentlyHoveredRow() {
    let { mostRecentScrollOffset, dragMoveY } = this;
    let absoluteDragOffsetInList = mostRecentScrollOffset + dragMoveY;

    return this.findRowIdAtOffset(absoluteDragOffsetInList);
  },

  /*
   * When we move the cursor we need to see what element we are hovering over.
   * If the row we are hovering over has changed, then update our state to
   * reflect that.
   */
  checkTargetElement() {
    let { hoveredRowId, activeRowId } = this.state;
    let newHoveredRowId = this.findCurrentlyHoveredRow();

    if (hoveredRowId !== newHoveredRowId) {
      LayoutAnimation.linear();

      this.setState({
        hoveredRowId: newHoveredRowId,
      });
    }
  },

  /*
   * This is called from a row when it becomes active (when it is long-pressed)
   */
  _handleRowActive(row) {
    this.state.panY.setValue(0);

    LayoutAnimation.linear();

    this.setState({
      isSorting: true,
      activeRowId: row.rowId,
      activeLayout: row.layout,
    }, this.scrollAnimation);
  },

  /*
   * It is possible to be in sorting state without being responder, this
   * happens when the underlying Touchable fires _handleRowActive but the
   * user doesn't move their finger, so the PanResponder never grabs
   * responder. To make sure this is always called, we fire
   * _handleRowInactive from onLongPressOut
   */
  _handleRowInactive() {
    if (this.state.isSorting && !this._isResponder) {
      this.setState({
        activeRowId: null,
        isSorting: false,
        hoveredRowId: null
      });
    }
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
          scrollEnabled={!this.state.isSorting}
          renderRow={(data, __unused, rowId) => this.renderRow(data, rowId)}
        />

        {this.renderGhostItem()}
      </View>
    );
  },

  renderRow(data, rowId, props = {}) {
    let RowComponent;
    let extraProps = {};

    if (props.isGhost) {
      RowComponent = GhostRow;
      extraProps.layout = this.state.activeLayout;
      extraProps.panY = this.state.panY;
    } else {
      RowComponent = Row;
    }

    return (
      <RowComponent
        {...this.props}
        {...extraProps}
        activeDivider={this.renderActiveDivider()}
        isHoveredOver={this.state.hoveringRowId === rowId}
        key={rowId}
        onLongPress={this._handleRowActive}
        onLongPressOut={this._handleRowInactive}
        onRowLayout={layout => this.layoutMap[rowId] = layout.nativeEvent.layout}
        panResponder={this.state.panResponder}
        rowData={data}
        rowId={rowId}
      />
    );
  },

  renderGhostItem() {
    if (!this.state.activeRowId) return;
    let itemId = this.state.activeRowId;
    let item = this.props.items[itemId];

    return this.renderRow(item, itemId, {isGhost: true});
  },

  /*
   * The divider creates a space in an view to indicate where the drop location
   * will be
   */
  renderActiveDivider() {
    let { activeRowId } = this.state;
    let height = activeRowId ? this.layoutMap[activeRowId].height : 0;

    return <View style={{height}} />;
  },

  _handleScroll(e) {
    this.mostRecentScrollOffset = e.nativeEvent.contentOffset.y;
    this.scrollContainerHeight = e.nativeEvent.contentSize.height;
  },

  _handleListLayout(e) {
    this.listLayout = e.nativeEvent.layout;
  },
});

export default SortableListView;
