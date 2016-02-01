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
  scrollValue: 0,

  // ???????
  moveY: null,

  getInitialState: function() {
    let currentPanValue = {x: 0, y: 0};
    let dataSource = new ListView.DataSource({
      rowHasChanged: (r1, r2) => r1 !== r2,
    });

    this.state = {
      dataSource: dataSource.cloneWithRows(this.props.items, this.props.sortOrder),
      sorting: false,
      active: false,
      pan: new Animated.ValueXY(currentPanValue)
    };

    let onPanResponderMoveCb = Animated.event([null, {
       dx: this.state.pan.x,
       dy: this.state.pan.y,
    }]);

    this.state.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (evt, gestureState) => {
        gestureState.dx = 0;

        this.moveY = gestureState.moveY;
        onPanResponderMoveCb(evt, gestureState);
      },

      onPanResponderGrant: (e, gestureState) => {
        console.log('grant!');
        this._isResponder = true;
        this.state.pan.setOffset(currentPanValue);
        this.state.pan.setValue(currentPanValue);
      },

      onPanResponderReject: (e, gestureState) => {
        console.log('rejected', e)
        this._isResponder = false;
      },

      onPanResponderTerminate: () => {
        console.log('terminate');
        this._isResponder = false;
      },

      onPanResponderRelease: (e) => {
        console.log('release');
        this._isResponder = false;
        this._handleRowInactive();
      }
     });

    return this.state;
  },

  componentWillReceiveProps(nextProps) {
    // TODO: should use immutable for this, call toArray when passing into cloneWithRows
    if (nextProps.items !== this.props.items || nextProps.sortOrder !== this.props.sortOrder) {
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
    if (this.isMounted() && this.state.active) {
      if (this.moveY === null) {
        return requestAnimationFrame(this.scrollAnimation);
      }

      let SCROLL_LOWER_BOUND = 100;
      let SCROLL_HIGHER_BOUND = this.listLayout.height - SCROLL_LOWER_BOUND;
      let MAX_SCROLL_VALUE = this.scrollContainerHeight;
      let currentScrollValue = this.scrollValue;
      let newScrollValue = null;
      let SCROLL_MAX_CHANGE = 15;

      if (this.moveY < SCROLL_LOWER_BOUND && currentScrollValue > 0) {
        let PERCENTAGE_CHANGE = 1 - (this.moveY / SCROLL_LOWER_BOUND);
          newScrollValue = currentScrollValue - (PERCENTAGE_CHANGE * SCROLL_MAX_CHANGE);
          if (newScrollValue < 0) newScrollValue = 0;
      }

      if (this.moveY > SCROLL_HIGHER_BOUND && currentScrollValue < MAX_SCROLL_VALUE) {

        let PERCENTAGE_CHANGE = 1 - ((this.listLayout.height - this.moveY) / SCROLL_LOWER_BOUND);
        newScrollValue = currentScrollValue + (PERCENTAGE_CHANGE * SCROLL_MAX_CHANGE);
        if (newScrollValue > MAX_SCROLL_VALUE) newScrollValue = MAX_SCROLL_VALUE;
      }

      if (newScrollValue !== null) {
        this.scrollValue = newScrollValue;
         this.scrollResponder.scrollWithoutAnimationTo(this.scrollValue, 0);
      }

      this.checkTargetElement();
      requestAnimationFrame(this.scrollAnimation);
    }
  },

  // TODO: rewrite this, super confusing!
  // When we move the cursor we need to see what element we are hovering over
  checkTargetElement() {
    let scrollValue = this.scrollValue;
    let moveY = this.moveY;
    let targetPixel = scrollValue + moveY;
    let i = 0;
    let x = 0;
    let row;

    while (i < targetPixel) {
      row = this.layoutMap[this.props.sortOrder[x]];
      if (!row) {
        return;
      }
      i += row.height;
      x++;
    }
    x--;

    let rowId = this.props.sortOrder[x];

    if (rowId !== this.state.hovering && rowId !== this.state.active.rowData.rowId) {
      LayoutAnimation.linear();

      this.setState({
        hovering: rowId,
      })
    }

  },

  // This is called from a Row when it becomes active
  _handleRowActive: function(row) {
    this.state.pan.setValue({x: 0, y: 0});

    LayoutAnimation.linear();

    this.setState({
      sorting: true,
      active: row
    }, this.scrollAnimation);
  },

  _handleRowInactive() {
    // It is possible to be in sorting state without being responder, this happens when
    // the underlying Touchable fires _handleRowActive but the user doesn't move their
    // finger, so the PanResponder never grabs responder. To make sure this is always
    // called, we fire _handleRowInactive from onLongPressOut
    if (this.state.sorting && !this._isResponder) {
      this.setState({active: false, sorting: false, hovering: false});
    }
  },

  // The divider creates a space in an view to indicate where the drop location will be
  renderActiveDivider: function() {
    if (this.props.activeDivider) {
      this.props.activeDivider();
    }

    return (
      <View style={{
        height: this.state.active ? this.state.active.layout.frameHeight : 0
      }} />
    );
  },

  renderRow: function(data, rowId, props) {
    let Component = props.active ? SortRow : Row;
    let isActiveRow = (!props.active && this.state.active && this.state.active.rowData.rowId === rowId);

    return (
      <Component
        {...this.props}
        activeDivider={this.renderActiveDivider()}
        key={rowId}
        active={isActiveRow}
        list={this}
        hovering={this.state.hovering === rowId}
        panResponder={this.state.panResponder}
        rowData={{data, rowId}}
        onLongPress={this._handleRowActive}
        onLongPressOut={this._handleRowInactive}
        onRowLayout={layout => this.layoutMap[rowId] = layout.nativeEvent.layout}
      />
    );
  },

  renderActive: function() {
    if (!this.state.active) return;
    let itemId = this.state.active.rowData.rowId;

    return this.renderRow(
      this.props.items[itemId],
      itemId,
      {active: true} // wat?
    );
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
            this.scrollValue = e.nativeEvent.contentOffset.y;
            this.scrollContainerHeight = e.nativeEvent.contentSize.height;
          }}
          onLayout={(e) => this.listLayout = e.nativeEvent.layout}
          scrollEnabled={!this.state.active}
          renderRow={(data, section, rowId, highlightfn, active) => {
            return this.renderRow(
              data,
              rowId,
              {active},
            );
          }}
        />

        {this.renderActive()}
      </View>
    );
  }
});

export default SortableListView;
