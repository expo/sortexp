import React, {
  Animated,
  PropTypes,
  StyleSheet,
  View,
} from 'react-native';

// This is supposed to account for "top bar spacing" in original version
// of this, not sure what that means
const MAGIC_NUMBER = 20;

const SortableListGhostRow = React.createClass({

  propTypes: {
    // TODO: fill this in
  },

  getInitialState() {
    return {
      opacity: new Animated.Value(0),
    };
  },

  componentWillMount() {
    let updateState = () => {
      let data = this.props.sharedListData.getState().activeItemState;
      let { activeLayout, activeRowId, activeRowData, isSorting } = data;

      this.setState({
        layout: activeLayout,
        rowId: activeRowId,
        rowData: activeRowData,
        isSorting,
      });
    }

    this._unsubscribe = this.props.sharedListData.subscribe(updateState);
    updateState();
  },

  componentDidUpdate(prevProps, prevState) {
    if (prevState.isSorting && !this.state.isSorting) {
      Animated.spring(this.state.opacity, {toValue: 0}).start();
    } else if (!prevState.isSorting && this.state.isSorting) {
      Animated.spring(this.state.opacity, {toValue: 1}).start();
    }
  },

  componentWillUnmount() {
    this._unsubscribe && this._unsubscribe();
    this._unsubscribe = null;
  },

  render() {
    let { rowData, rowId, layout, opacity, isSorting } = this.state;
    let { panY } = this.props;

    let height = 0;
    let marginTop = 0;

    if (layout) {
      height = layout.frameHeight;
      marginTop = layout.pageY - MAGIC_NUMBER;
    }

    let dynamicStyles = {
      height,
      marginTop,
      opacity,
      top: panY,
      elevation: opacity.interpolate({inputRange: [0, 1], outputRange: [0, 3]}),
    };

    return (
      <Animated.View
        style={[styles.base, dynamicStyles]}
        pointerEvents="none">
        {rowId && this.props.renderRow(rowData, rowId, {ghost: true})}
      </Animated.View>
    );
  }
});

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: '#eee',
    shadowColor: '#eee',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
});

export default SortableListGhostRow;
