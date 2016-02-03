import React, {
  PropTypes,
  View,
} from 'react-native';

import { shallowEquals, shallowEqualsIgnoreKeys } from 'ShallowEquals';

const DEBUG_HOVER = false;
const DEBUG_LIFECYCLE = true;

const SortableListRow = React.createClass({

  propTypes: {
    // TODO: fill this in
  },

  getInitialState() {
    return {
      dividerHeight: 0,
      dividerIsVisible: false,
      rowIsVisible: true,
      rowIsZeroOpacity: false,
    };
  },

  componentWillMount() {
    DEBUG_LIFECYCLE && console.log({
      mount: true,
      rowId: this.props.rowId,
    });

    let updateHoverState = () => {
      let data = this.props.sharedListData.getState();
      let { rowId } = this.props;
      let { isSorting, activeRowId, dividerHeight } = data.activeItemState;
      let { hoveredRowId } = data;
      let isActiveRow = activeRowId === rowId;
      let isHoveredOver = hoveredRowId === rowId;
      let nextState = {};

      // Is the row visible?
      if (!isSorting) {
        nextState.rowIsVisible = true;
        nextState.rowIsZeroOpacity = false;
      } else {
        if (isActiveRow && isHoveredOver) {
          nextState.rowIsVisible = true;
          nextState.rowIsZeroOpacity = true;
        } else if (isActiveRow && !isHoveredOver) {
          nextState.rowIsVisible = false;
          nextState.rowIsZeroOpacity = false;
        } else {
          nextState.rowIsVisible = true;
          nextState.rowIsZeroOpacity = false;
        }
      }

      // Is the divider visible?
      if (!isSorting || isActiveRow || !isHoveredOver) {
        nextState.dividerIsVisible = false;
      } else if (isSorting && isHoveredOver && !isActiveRow) {
        nextState.dividerIsVisible = true;
      }

      DEBUG_HOVER && console.log({
        rowId,
        isActiveRow,
        isHoveredOver,
        ...nextState,
      });

      if (!shallowEquals(this.state, nextState)) {
        nextState.dividerHeight = dividerHeight;
        this.setState(nextState);
      }
    }

    this._unsubscribe = this.props.sharedListData.subscribe(updateHoverState);
    updateHoverState();
  },

  componentWillUnmount() {
    this._unsubscribe && this._unsubscribe();
    this._unsubscribe = null;
  },

  shouldComponentUpdate(nextProps, nextState) {
    let stateHasChanged = !shallowEqualsIgnoreKeys(this.state, nextState, ['dividerHeight']);
    let propsHaveChanged = nextProps.rowData !== this.props.rowData;

    return stateHasChanged || propsHaveChanged;
  },

  handleLongPress(e) {
    this.refs.view.measure((frameX, frameY, frameWidth, frameHeight, pageX, pageY) => {
      let MAGIC_NUMBER = -6;
      let layout = {
        frameX,
        frameY,
        frameWidth,
        frameHeight,
        pageX,
        pageY: pageY + MAGIC_NUMBER
      };

      this.props.onLongPress({
        layout: layout,
        touch: e.nativeEvent,
        rowData: this.props.rowData,
        rowId: this.props.rowId,
      });
    });
  },

  handlePressOut() {
    this.props.onPressOut && this.props.onPressOut();
  },

  render() {
    let item = this.props.renderRow(
      this.props.rowData,
      this.props.rowId,
      {
        onLongPress: this.handleLongPress,
        onPressOut: this.handlePressOut,
      },
    );

    let {
      dividerHeight,
      dividerIsVisible,
      rowIsVisible,
      rowIsZeroOpacity,
    } = this.state;

    let innerViews = [];

    if (dividerIsVisible) {
      innerViews.push(
        <View style={{height: dividerHeight}} key="divider" />
      );
    }

    if (rowIsVisible) {
      innerViews.push(item);
    }

    DEBUG_LIFECYCLE && console.log({
      render: true,
      rowId: this.props.rowId,
    });

    return (
      <View
        onLayout={this.props.onRowLayout}
        key={this.props.rowId}
        ref="view"
        style={rowIsZeroOpacity ? {opacity: 0} : {}}>
        {innerViews}
      </View>
    );
  }
});

export default SortableListRow;
