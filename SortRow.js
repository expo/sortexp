var React = require('react-native');

var {
  ListView,
  LayoutAnimation,
  View,
  Animated,
  PanResponder,
  TouchableWithoutFeedback
} = React;

var SortRow = React.createClass({

  getInitialState: function() {
    // TODO: yikes, reaching into another component's state
    let activeRowId = this.props.list.state.activeRowId;
    let layout = this.props.list.state.activeLayout;
    let rowLayout = this.props.list.layoutMap[this.props.rowData.rowId];

    return {
      style: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: layout.frameHeight,
        overflow: 'hidden',
        backgroundColor: 'transparent',
        borderWidth: 0.5,
        borderColor: '#eee',
        marginTop: layout.pageY - 20, // Account for top bar spacing
      }
    }
  },

  render: function() {
    let item = this.props.renderRow(
      this.props.rowData.data,
      this.props.rowData.rowId,
      {
        active: true,
      }
    );

    return (
      <Animated.View
        elevation={3}
        style={[this.state.style, this.props.list.state.pan.getLayout()]}>
        {item}
      </Animated.View>
    );
  }
});

export default SortRow;
