import React, {
  PropTypes,
  View,
} from 'react-native';

import { shallowEquals, shallowEqualsIgnoreKeys } from 'ShallowEquals';

const SortableListRowContainer = React.createClass({

  propTypes: {
    onLongPress: PropTypes.func.isRequired,
    onPressOut: PropTypes.func.isRequired,
    onRowLayout: PropTypes.func.isRequired,
    renderRow: PropTypes.func.isRequired,
    rowData: PropTypes.any.isRequired,
    rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    sharedListData: PropTypes.object.isRequired,
  },

  getInitialState() {
    return {
      dividerHeight: 0,
      dividerIsVisible: false,
      rowIsVisible: true,
    };
  },

  componentWillMount() {
    let updateHoverState = () => {
      let data = this.props.sharedListData.getState();
      let { rowId } = this.props;
      let { isSorting, activeRowId, dividerHeight } = data.activeItemState;
      let { hoveredRowId } = data;
      let isActiveRow = activeRowId === rowId;
      let isHoveredOver = hoveredRowId === rowId;
      let nextState = {};

      // Is the row visible?
      if (isSorting && isActiveRow) {
        nextState.rowIsVisible = false;
      } else if (isSorting && !isActiveRow || !isSorting) {
        nextState.rowIsVisible = true;
      }

      // Is the divider visible?
      if (isSorting && isHoveredOver) {
        nextState.dividerIsVisible = true;
      } else {
        nextState.dividerIsVisible = false;
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

  _onLayout(layout) {
    // Don't update layout if it's just as a result of row hiding or
    // divider showing up
    if (this.state.rowIsVisible && !this.state.dividerIsVisible) {
      this.props.onRowLayout(layout);
    }
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
    } = this.state;

    let innerViews = [];

    if (rowIsVisible) {
      innerViews.push(item);
    }

    // TODO: this style is hardcoded, should have a renderDivider func
    // to make this customizable
    if (dividerIsVisible) {
      innerViews.push(
        <View style={{
          height: dividerHeight,
        }} key="divider" />
      );
    }

    return (
      <View
        onLayout={this._onLayout}
        key={this.props.rowId}
        ref={view => { this._view = view; }}>
        {innerViews}
      </View>
    );
  }
});

export default SortableListRowContainer;
