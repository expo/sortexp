import React, {
  PropTypes,
  View,
} from 'react-native';

import { shallowEquals, shallowEqualsIgnoreKeys } from 'ShallowEquals';

const DEBUG_HOVER = false;
const DEBUG_LIFECYCLE = false;

const SortableListRowContainer = React.createClass({

  propTypes: {
    onLongPress: PropTypes.func.isRequired,
    onPressOut: PropTypes.func.isRequired,
    onRowLayout: PropTypes.func.isRequired,
    renderRow: PropTypes.func.isRequired,
    rowData: PropTypes.any.isRequired,
    rowId: PropTypes.oneOf([PropTypes.string, PropTypes.number]).isRequired,
    sharedListData: PropTypes.object.isRequired,
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
          nextState.rowIsZeroOpacity = false;
        } else if (isActiveRow && !isHoveredOver && hoveredRowId !== null) {
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

      if (DEBUG_HOVER && isActiveRow) {
        console.log({
          rowId,
          isActiveRow,
          isHoveredOver,
          ...nextState,
        });
      }

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

  measure(callback) {
    this._view.measure((frameX, frameY, frameWidth, frameHeight, pageX, pageY) => {
      let layout = {
        frameX,
        frameY,
        frameWidth,
        frameHeight,
        pageX,
        pageY,
      };

      callback(layout);
    });
  },

  handleLongPress(e) {
    this.measure(layout => {
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
      // TODO: this style is hardcoded, should have a renderDivider func
      // to make this customizable
      innerViews.push(
        <View style={{
          height: dividerHeight,
          borderBottomWidth: 1,
          borderBottomColor: '#eee'
        }} key="divider" />
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
        ref={view => { this._view = view; }}
        style={rowIsZeroOpacity ? {opacity: 0} : {}}>
        {innerViews}
      </View>
    );
  }
});

export default SortableListRowContainer;