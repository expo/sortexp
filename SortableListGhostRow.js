import React, {
  Animated,
  PropTypes,
  StyleSheet,
  View,
} from 'react-native';

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
      Animated.timing(this.state.opacity, {toValue: 0, duration: 250}).start();
    } else if (!prevState.isSorting && this.state.isSorting) {
      requestAnimationFrame(() => {
        this.state.opacity.setValue(1);
      });
    }
  },

  componentWillUnmount() {
    this._unsubscribe && this._unsubscribe();
    this._unsubscribe = null;
  },

  render() {
    let { rowData, rowId, layout, opacity, isSorting } = this.state;
    let { panY, snapY } = this.props;

    let height = 0;
    let marginTop = 0;

    if (layout) {
      height = layout.frameHeight;
      marginTop = layout.pageY;
    }

    let dynamicStyles = {
      height,
      opacity,
    };

    if (isSorting) {
      dynamicStyles.marginTop = marginTop;
      dynamicStyles.top = panY;
      dynamicStyles.elevation = opacity.interpolate({inputRange: [0, 1], outputRange: [0, 3]});
    } else {
      dynamicStyles.marginTop = 0;
      dynamicStyles.top = snapY;
    }

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
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#eee',
    shadowColor: '#eee',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
});

export default SortableListGhostRow;
