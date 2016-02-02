import React, {
  View,
} from 'react-native';

const Row = React.createClass({

  getInitialState() {
    return {
      isHoveredOver: false,
    };
  },

  componentWillMount() {
  },

  shouldComponentUpdate(props) {
    if (props.rowData !== this.props.rowData) return true;
    return false;
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

  handleLongPressOut(e) {
    this.props.onLongPressOut && this.props.onLongPressOut();
  },

  render() {
    let item = this.props.renderRow(
      this.props.rowData,
      this.props.rowId,
      {
        onLongPress: this.handleLongPress,
        onPressOut: this.handleLongPressOut,
      }
    );

    return (
      <View onLayout={this.props.onRowLayout} ref="view">
        {this.state.isHoveredOver && this.props.activeDivider}
        {item}
      </View>
    );
  }
});

export default Row;
