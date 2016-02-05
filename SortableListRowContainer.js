import React, {
  PropTypes,
  View,
} from 'react-native';

import { shallowEquals } from 'ShallowEquals';
import cloneReferencedElement from 'react-clone-referenced-element';

const SortableListRowContainer = React.createClass({

  propTypes: {
    onLongPress: PropTypes.func.isRequired,
    onPressOut: PropTypes.func.isRequired,
    onRowLayout: PropTypes.func.isRequired,
    renderDivider: PropTypes.func.isRequired,
    renderRow: PropTypes.func.isRequired,
    rowData: PropTypes.any.isRequired,
    rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    sharedListData: PropTypes.object.isRequired,
  },

  getInitialState() {
    return {
      dividerIsVisible: false,
      rowIsVisible: true,
    };
  },

  componentWillMount() {
    let getHoverState = (data) => {
      let { rowId } = this.props;
      let { isSorting, activeRowId } = data.activeItemState;
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

      return nextState;
    };

    let getLabelState = (data) => {
      return {
        labelFormat: data.labelState.format,
        labelText: data.labelState.textByRowId[this.props.rowId],
      };
    };

    let updateState = () => {
      let data = this.props.sharedListData.getState();
      let nextState = {
        ...getHoverState(data),
        ...getLabelState(data),
      };

      if (!shallowEquals(this.state, nextState)) {
        this.setState(nextState);
      }
    };

    this._unsubscribe = this.props.sharedListData.subscribe(updateState);
    updateState();
  },

  componentWillUnmount() {
    this._unsubscribe && this._unsubscribe();
    this._unsubscribe = null;
  },

  shouldComponentUpdate(nextProps, nextState) {
    let stateHasChanged = !shallowEquals(this.state, nextState);
    let propsHaveChanged = nextProps.rowData !== this.props.rowData;

    return stateHasChanged || propsHaveChanged;
  },

  render() {
    let { dividerIsVisible, rowIsVisible } = this.state;
    let innerViews = [];

    if (rowIsVisible) {
      let item = this.props.renderRow(
        this.props.rowData,
        this.props.rowId,
        {
          labelFormat: this.state.labelFormat,
          labelText: this.state.labelText,
          onLongPress: this.handleLongPress,
          onPressOut: this.handlePressOut,
        },
      );

      let itemWithRef = cloneReferencedElement(item, {
        ref: component => { this._item = component; },
      });

      innerViews.push(itemWithRef);
    }

    if (dividerIsVisible) {
      innerViews.push(this.props.renderDivider());
    }

    return (
      <View
        onLayout={this._onLayout}
        key={this.props.rowId}
        ref={view => { this._view = view; }}>
        {innerViews}
      </View>
    );
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
    // Don't update layout if it's just as a result of divider showing up
    if (!this.state.dividerIsVisible) {
      this.props.onRowLayout(layout);
    }
  },

});

export default SortableListRowContainer;
