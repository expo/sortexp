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
    if (props.hovering !== this.props.hovering) return true;
    if (props.rowData.data !== this.props.rowData.data) return true;
    return false;
  },

  handleLongPress: function(e) {
    this.refs.view.measure((frameX, frameY, frameWidth, frameHeight, pageX, pageY) => {
      let layout = {frameX, frameY, frameWidth, frameHeight, pageX, pageY};

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
    let layout = this.props.list.layoutMap[this.props.rowData.index];
    let activeData = this.props.list.state.active;

    let activeIndex = activeData ? Number(activeData.rowData.index) : -5;
    let shouldDisplayHovering = !(activeIndex == this.props.rowData.index || activeIndex + 1 == this.props.rowData.index);
    let item = this.props.renderRow(
      this.props.rowData.data,
      this.props.rowData.rowId,
      {
        active: this.props.active,
        onLongPress: this.handleLongPress,
        onPressOut: this.handleLongPressOut,
      }
    );

    return (
      <View
        onLayout={this.props.onRowLayout}
        style={this.props.active ? {opacity: .3}: null}
        ref="view">
        {this.props.hovering && shouldDisplayHovering ? this.props.activeDivider : null}
        {item}
      </View>
    );
  }
});

export default Row;
