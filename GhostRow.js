var React = require('react-native');

var {
  ListView,
  LayoutAnimation,
  View,
  Animated,
  PanResponder,
  TouchableWithoutFeedback
} = React;

var GhostRow = React.createClass({

  getInitialState: function() {
    // TODO: fade it out when we release
    return {
    };
  },

  render: function() {
    let item = this.props.renderRow(
      this.props.rowData.data,
      this.props.rowData.rowId,
      { active: true },
    );

    // TODO: yikes, reaching into another component's state
    let rowId = this.props.list.state.activeRowId;
    let layout = this.props.list.state.activeLayout;
    let rowLayout = this.props.list.layoutMap[rowId];

    let style = {
      position: 'absolute',
      elevation: 3,
      left: 0,
      right: 0,
      height: layout.frameHeight,
      overflow: 'hidden',
      backgroundColor: 'transparent',
      borderWidth: 0.5,
      borderColor: '#eee',
      marginTop: layout.pageY - 20, // Account for top bar spacing (???)
    };

    return (
      <Animated.View style={[style, {top: this.props.list.state.panY}]}>
        {item}
      </Animated.View>
    );
  }
});

export default GhostRow;
