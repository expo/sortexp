import React, {
  Animated,
  PropTypes,
  StyleSheet,
  View,
} from 'react-native';

const SortableListGhostRowContainer = React.createClass({

  propTypes: {
    panY: PropTypes.object.isRequired,
    snapY: PropTypes.object.isRequired,
    renderRow: PropTypes.func.isRequired,
    sharedListData: PropTypes.object.isRequired,
  },

  getInitialState() {
    return {
      opacity: new Animated.Value(0),
    };
  },

  componentWillMount() {
    let updateState = () => {
      let data = this.props.sharedListData.getState();
      let { activeItemState, labelState } = data;
      let { activeLayout, activeRowId, activeRowData, isSorting } = activeItemState;
      let { format: labelFormat } = labelState;
      let labelText = labelState.textByRowId[activeRowId];

      this.setState({
        layout: activeLayout,
        rowId: activeRowId,
        rowData: activeRowData,
        isSorting,
        labelText,
        labelFormat,
      });
    }

    this._unsubscribe = this.props.sharedListData.subscribe(updateState);
    updateState();
  },

  componentDidUpdate(prevProps, prevState) {
    if (prevState.isSorting && !this.state.isSorting) {
      Animated.timing(this.state.opacity, {toValue: 0, duration: 150}).start();
    } else if (!prevState.isSorting && this.state.isSorting) {
      requestAnimationFrame(() => {
        Animated.timing(this.state.opacity, {fromValue: 0.5, toValue: 1, duration: 100}).start();
      });
    }
  },

  componentWillUnmount() {
    this._unsubscribe && this._unsubscribe();
    this._unsubscribe = null;
  },

  render() {
    let { rowData, rowId, layout, opacity, isSorting, labelText, labelFormat } = this.state;
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
      shadowRadius: opacity.interpolate({inputRange: [0, 1], outputRange: [0, 6]}),
    };

    if (isSorting) {
      dynamicStyles.marginTop = marginTop;
      dynamicStyles.top = panY;
      dynamicStyles.elevation = opacity.interpolate({inputRange: [0, 0.999, 1], outputRange: [0, 0, 5]});
    } else {
      dynamicStyles.marginTop = 0;
      dynamicStyles.top = snapY;
    }

    return (
      <Animated.View
        style={[styles.base, dynamicStyles]}
        pointerEvents="none">
        {rowId && this.props.renderRow(rowData, rowId, {ghost: true, labelText, labelFormat})}
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
    shadowColor: '#888',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.85,
  },
});

export default SortableListGhostRowContainer;
