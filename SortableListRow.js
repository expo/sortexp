import React, {
  View,
} from 'react-native';

const SortableListRow = React.createClass({
  getInitialState() {
    return {
      dividerHeight: 0,
      isHoveredOver: false,
      isActiveRow: false,
    };
  },

  componentWillMount() {
    let updateHoverState = () => {
      let data = this.props.sharedListData.getState();
      let nextState = {};

      // Is the row active?
      if (data.activeItemState.activeRowId === this.props.rowId) {
        nextState.isActiveRow = true;
      } else {
        nextState.isActiveRow = false;
      }

      // Is the row being hovered over?
      if (data.hoverRowId === this.props.rowId) {
        nextState.isHoveredOver = true;
        nextState.dividerHeight = data.activeItemState.dividerHeight;
      } else if (this.state.isHoveredOver) {
        nextState.isHoveredOver = false;
        nextState.dividerHeight = 0;
      }

      this.setState(nextState);
    }

    this._unsubscribe = this.props.sharedListData.subscribe(updateHoverState);
    updateHoverState();
  },

  componentWillUnmount() {
    this._unsubscribe && this._unsubscribe();
    this._unsubscribe = null;
  },

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.rowData !== this.props.rowData) {
      return true;
    } else if (nextState.isHoveredOver !== this.state.isHoveredOver) {
      return true;
    } else if (nextState.isActiveRow !== this.state.isActiveRow)  {
      return true;
    } else if (nextState.dividerHeight !== this.state.dividerHeight) {
      return true;
    } else {
      return false;
    }
  },

  handleLongPress(e) {
    console.log('handleLongPress');

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
    console.log('handlePressOut');
    this.props.onPressOut && this.props.onPressOut();
  },

  handlePress() {
    console.log('handlePress');
    this.props.onPress && this.props.onPress();
  },

  render() {
    let item = this.props.renderRow(
      this.props.rowData,
      this.props.rowId,
      {
        onLongPress: this.handleLongPress,
        onPressOut: this.handlePressOut,
        onPress: this.handlePress,
      },
    );

    let { isActiveRow, isHoveredOver } = this.state;

    let innerViews = [];

    if (isHoveredOver && !isActiveRow) {
      innerViews.push(
        <View style={{height: this.state.dividerHeight}} key="divider" />
      );
    } else if (isHoveredOver && isActiveRow) {
      innerViews.push(item);
    }

    if (!isHoveredOver && !isActiveRow) {
      innerViews.push(item);
    }


    let { dividerHeight } = this.state;
    if (dividerHeight) {
      console.log({dividerHeight});
    }

    return (
      <View
        onLayout={this.props.onRowLayout}
        ref="view"
        style={isHoveredOver && isActiveRow ? {opacity: 0} : {}}>
        {innerViews}
      </View>
    );
  }
});

export default SortableListRow;
