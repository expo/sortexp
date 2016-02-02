var React = require('react-native');

var {
  Animated,
  StyleSheet,
  View,
} = React;

var GhostRow = React.createClass({

  shouldComponentUpdate() {
    // TODO: update this
    return true;
  },

  getInitialState: function() {
    // TODO: fade it out when we release touch
    return {};
  },

  render: function() {
    let {
      rowData,
      layout,
      panY,
    } = this.props;

    let item = this.props.renderRow(
      rowData.data,
      rowData.rowId,
      { active: true },
    );

    let dynamicStyles = {
      top: panY,
      height: layout.frameHeight,
      marginTop: layout.pageY - 20, // Account for top bar spacing (???)
    };

    return (
      <Animated.View style={[styles.base, dynamicStyles]}>
        {item}
      </Animated.View>
    );
  }
});

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    elevation: 3,
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: '#eee',
  },
});

export default GhostRow;
