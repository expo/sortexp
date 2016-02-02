import React, {
  View,
} from 'react-native';

const Row = React.createClass({

  shouldComponentUpdate(props) {
    if (props.isHoveredOver !== this.props.isHoveredOver) return true;
    if (props.rowData.data !== this.props.rowData.data) return true;
    return false;
  },

  handleLongPress(e) {
    this.refs.view.measure((frameX, frameY, frameWidth, frameHeight, pageX, pageY) => {
      let layout = {frameX, frameY, frameWidth, frameHeight, pageX, pageY: pageY - 6};

      this.props.onLongPress({
        layout: layout,
        touch: e.nativeEvent,
        rowData: this.props.rowData
      });
    });
  },

  handleLongPressOut(e) {
    this.props.onLongPressOut && this.props.onLongPressOut();
  },

  render() {
    let item = this.props.renderRow(
      this.props.rowData.data,
      this.props.rowData.rowId,
      {
        onLongPress: this.handleLongPress,
        onPressOut: this.handleLongPressOut,
      }
    );

    return (
      <View onLayout={this.props.onRowLayout} ref="view">
        {this.props.isHoveredOver && this.props.activeDivider}
        {item}
      </View>
    );
  }
});

export default Row;
