var React = require('react-native');

var {
  ListView,
  LayoutAnimation,
  View,
  Animated,
  PanResponder,
  TouchableWithoutFeedback
} = React;

import Row from './Row';
import SortRow from './SortRow';

var SortableListView = React.createClass({

  // Keep track of layouts of each row
  layoutMap: {},

  // Keep track of the current scroll position
  mostRecentScrollOffset: 0,

  // ???????
  dragMoveY: null,

  getInitialState: function() {
    let {
      items,
      sortOrder,
    } = this.props;

    let currentPanValue = {
      x: 0,
      y: 0,
    };

    let dataSource = new ListView.DataSource({
      rowHasChanged: (r1, r2) => r1 !== r2,
    });

    this.state = {
      dataSource: dataSource.cloneWithRows(items, sortOrder),
      isSorting: false,
      activeRowId: null,
      pan: new Animated.ValueXY(currentPanValue)
    };

    let eventCallback = Animated.event([null, {
       dx: this.state.pan.x,
       dy: this.state.pan.y,
    }]);

    this.state.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => this.state.isSorting,
      onMoveShouldSetResponderCapture: () => this.state.isSorting,
      onMoveShouldSetPanResponder: () => this.state.isSorting,
      onMoveShouldSetPanResponderCapture: () => this.state.isSorting,
      onPanResponderMove: (evt, gestureState) => {
        gestureState.dx = 0;
        this.dragMoveY = gestureState.moveY;
        eventCallback(evt, gestureState);
      },

      onPanResponderGrant: (e, gestureState) => {
        this._isResponder = true;
        this.state.pan.setOffset(currentPanValue);
        this.state.pan.setValue(currentPanValue);
      },

      onPanResponderReject: (e, gestureState) => {
        this._isResponder = false;
      },

      onPanResponderTerminate: () => {
        this._isResponder = false;
      },

      onPanResponderRelease: (e) => {
        this._isResponder = false;
        this._handleRowInactive();
      }
     });

    return this.state;
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

  componentDidMount: function() {
    this.scrollResponder = this.refs.list.getScrollResponder();
  },

  // ?????????????????
  scrollAnimation: function() {
    if (this.isMounted() && this.state.activeRowId) {
      if (this.dragMoveY === null) {
        return requestAnimationFrame(this.scrollAnimation);
      }

      let SCROLL_LOWER_BOUND = 100;
      let SCROLL_HIGHER_BOUND = this.listLayout.height - SCROLL_LOWER_BOUND;
      let MAX_SCROLL_VALUE = this.scrollContainerHeight;
      let currentScrollValue = this.mostRecentScrollOffset;
      let newScrollValue = null;
      let SCROLL_MAX_CHANGE = 15;

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

    let heightAcc = 0; // wut
    let rowIdx = 0; // wut
    let rowLayout; // wut

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

  // TODO: rewrite this, super confusing!
  // When we move the cursor we need to see what element we are hovering over
  checkTargetElement() {
    let { hoveredRowId, activeRowId } = this.state;
    let newHoveredRowId = this.findCurrentlyHoveredRow();

    if (hoveredRowId !== newHoveredRowId) {
      LayoutAnimation.linear();

      this.setState({
        hoveredRowId: newHoveredRowId,
      })
    }
  },

  // This is called from a Row when it becomes active
  _handleRowActive: function(row) {
    this.state.pan.setValue({x: 0, y: 0});

    LayoutAnimation.linear();

    this.setState({
      isSorting: true,
      activeRowId: row.rowData.rowId,
      activeLayout: row.layout,
    }, this.scrollAnimation);
  },

  /* It is possible to be in sorting state without being responder, this
   * happens when the underlying Touchable fires _handleRowActive but the
   * user doesn't move their finger, so the PanResponder never grabs
   * responder. To make sure this is always called, we fire
   * _handleRowInactive from onLongPressOut */
  _handleRowInactive() {
    if (this.state.isSorting && !this._isResponder) {
      this.setState({
        activeRowId: null,
        isSorting: false,
        hoveredRowId: null
      });
    }
  },

  /* The divider creates a space in an view to indicate where the drop location
   * will be */
  renderActiveDivider: function() {
    let { activeRowId } = this.state;
    let height = activeRowId ? this.layoutMap[activeRowId] : 0;

    return <View style={{height}} />;
  },

  render: function() {
    return (
      <View style={{flex: 1}}>
        <ListView
          {...this.props}
          {...this.state.panResponder.panHandlers}
          ref="list"
          dataSource={this.state.dataSource}
          onScroll={e => {
            this.mostRecentScrollOffset = e.nativeEvent.contentOffset.y;
            this.scrollContainerHeight = e.nativeEvent.contentSize.height;
          }}
          onLayout={(e) => this.listLayout = e.nativeEvent.layout}
          scrollEnabled={!this.state.isSorting}
          renderRow={(data, _unused, rowId, __unused, ___unused) => {
            return this.renderRow(data, rowId);
          }}
        />

        {this.renderGhostItem()}
      </View>
    );
  },

  renderRow: function(data, rowId, props = {}) {
    let Component = props.isGhost ? SortRow : Row;
    let isActiveRow = this.state.active && this.state.active.rowData.rowId === rowId;

    return (
      <Component
        {...this.props}
        active={isActiveRow}
        activeDivider={this.renderActiveDivider()}
        hovering={this.state.hoveringRowId === rowId}
        key={rowId}
        list={this}
        onLongPress={this._handleRowActive}
        onLongPressOut={this._handleRowInactive}
        onRowLayout={layout => this.layoutMap[rowId] = layout.nativeEvent.layout}
        panResponder={this.state.panResponder}
        rowData={{data, rowId}}
      />
    );
  },

  renderGhostItem: function() {
    if (!this.state.activeRowId) return;
    let itemId = this.state.activeRowId;
    let item = this.props.items[itemId];

    return this.renderRow(item, itemId, {isGhost: true});
  },

});

export default SortableListView;
