var React = require('react-native');

var {
  ListView,
  LayoutAnimation,
  View,
  Animated,
  PanResponder,
  TouchableWithoutFeedback
} = React;

var Row = React.createClass({

  shouldComponentUpdate: function(props) {
    if (props.isHoveredOver !== this.props.isHoveredOver) return true;
    if (props.rowData.data !== this.props.rowData.data) return true;
    return false;
  },

  handleLongPress: function(e) {
    this.refs.view.measure((frameX, frameY, frameWidth, frameHeight, pageX, pageY) => {
      let layout = {frameX, frameY, frameWidth, frameHeight, pageX, pageY: pageY - 6};

      this.props.onLongPress({
        layout: layout,
        touch: e.nativeEvent,
        rowData: this.props.rowData
      });
    });
  },

  handleLongPressOut: function(e) {
    this.props.onLongPressOut && this.props.onLongPressOut();
  },

  render: function() {
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
