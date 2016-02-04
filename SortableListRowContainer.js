import React, {
  Animated,
  Easing,
  PropTypes,
  View,
} from 'react-native';

import { shallowEquals, shallowEqualsIgnoreKeys } from 'ShallowEquals';

const DEBUG_HOVER = true;
const DEBUG_LIFECYCLE = false;

const SortableListRowContainer = React.createClass({

  propTypes: {
    onLongPress: PropTypes.func.isRequired,
    onPressOut: PropTypes.func.isRequired,
    onRowLayout: PropTypes.func.isRequired,
    renderRow: PropTypes.func.isRequired,
    rowData: PropTypes.any.isRequired,
    rowId: PropTypes.oneOf([PropTypes.string, PropTypes.number]).isRequired,
    sharedListData: PropTypes.object.isRequired,
  },

  getInitialState() {
    return {
      animatedDividerHeight: new Animated.Value(0),
      animatedItemHeight: new Animated.Value(90),
      animatedItemOpacity: new Animated.Value(1),
      dividerHeight: 0,
      dividerIsVisible: false,
      rowIsVisible: true,
      rowIsZeroOpacity: false,
    };
  },

  componentWillMount() {
    this.state.animatedDividerHeight.addListener(e => {
      console.log(e);
    });

    DEBUG_LIFECYCLE && console.log({
      mount: true,
      rowId: this.props.rowId,
    });

    let updateHoverState = () => {
      let data = this.props.sharedListData.getState();
      let { rowId } = this.props;
      let { isSorting, activeRowId, dividerHeight } = data.activeItemState;
      let { hoveredRowId } = data;
      let isActiveRow = activeRowId === rowId;
      let isHoveredOver = hoveredRowId === rowId;
      let nextState = {};

      // Is the row visible?
      if (!isSorting) {
        nextState.rowIsVisible = true;
        nextState.rowIsZeroOpacity = false;
      } else {
        if (isActiveRow && isHoveredOver) {
          nextState.rowIsVisible = true;
          nextState.rowIsZeroOpacity = true;
        } else if (isActiveRow && !isHoveredOver) {
          nextState.rowIsVisible = false;
          nextState.rowIsZeroOpacity = true;
        } else {
          nextState.rowIsVisible = true;
          nextState.rowIsZeroOpacity = false;
        }
      }

      // Is the divider visible?
      if (!isSorting || isActiveRow || !isHoveredOver) {
        nextState.dividerIsVisible = false;
      } else if (isSorting && isHoveredOver && !isActiveRow) {
        nextState.dividerIsVisible = true;
      }

      if (DEBUG_HOVER && (isActiveRow || isHoveredOver)) {
        console.log({
          rowId,
          isActiveRow,
          isHoveredOver,
          isSorting,
          ...nextState,
        });
      }

      if (!shallowEquals(this.state, nextState)) {
        nextState.dividerHeight = dividerHeight;
        this.setState(nextState);
      }
    }

    this._unsubscribe = this.props.sharedListData.subscribe(updateHoverState);
    updateHoverState();
  },

  componentDidUpdate(prevProps, prevState) {
    if (prevState.dividerIsVisible && !this.state.dividerIsVisible) {
      this._animateValue('animatedDividerHeight', {toValue: 0});
    } else if (!prevState.dividerIsVisible && this.state.dividerIsVisible) {
      this._animateValue('animatedDividerHeight', {toValue: this.state.dividerHeight});
    }

    // if (prevState.rowIsVisible && !this.state.rowIsVisible) {
    //   this._animateValue('animatedItemHeight', {toValue: 0});
    // } else if (!prevState.rowIsVisible && this.state.rowIsVisible) {
    //   this._animateValue('animatedItemHeight', {toValue: 90});
    // }

    if (prevState.rowIsZeroOpacity && !this.state.rowIsZeroOpacity) {
      this._animateValue('animatedItemOpacity', {toValue: 1});
    } else if (!prevState.rowIsZeroOpacity && this.state.rowIsZeroOpacity) {
      this._animateValue('animatedItemOpacity', {toValue: 0.5, duration: 16});
    }
  },

  _animateValue(animatedValue, options) {
    console.log({
      rowId: this.props.rowId,
      animatedValue,
      options,
    })
    Animated.timing(this.state[animatedValue], {
      easing: Easing.linear,
      duration: 200,
      ...options,
    }).start(({finished}) => {
    });
  },

  componentWillUnmount() {
    this._unsubscribe && this._unsubscribe();
    this._unsubscribe = null;
  },

  shouldComponentUpdate(nextProps, nextState) {
    let stateHasChanged = !shallowEqualsIgnoreKeys(this.state, nextState, ['dividerHeight']);
    let propsHaveChanged = nextProps.rowData !== this.props.rowData;

    return stateHasChanged || propsHaveChanged;
  },

  measure(callback) {
    this._view.measure((frameX, frameY, frameWidth, frameHeight, pageX, pageY) => {
      let layout = {
        frameX,
        frameY,
        frameWidth,
        frameHeight,
        pageX,
        pageY,
      };

      callback(layout);
    });
  },

  handleLongPress(e) {
    this.measure(layout => {
      this.props.onLongPress({
        layout: layout,
        touch: e.nativeEvent,
        rowData: this.props.rowData,
        rowId: this.props.rowId,
      });
    });
  },

  handlePressOut() {
    this.props.onPressOut && this.props.onPressOut();
  },

  _onLayout(layout) {
    // Don't update layout if it's just as a result of row hiding or
    // divider showing up
    if (this.state.rowIsVisible && !this.state.dividerIsVisible) {
      this.props.onRowLayout(layout);
    }
  },

  render() {
    if (this._cachedElement) {
      return this._cachedElement;
    }

    let {
      animatedDividerHeight,
      animatedItemHeight,
      animatedItemOpacity,
    } = this.state;

    let item = this.props.renderRow(
      this.props.rowData,
      this.props.rowId,
      {
        onLongPress: this.handleLongPress,
        onPressOut: this.handlePressOut,
      },
    );

    this._cachedElement = (
      <View key={this.props.rowId} ref={view => { this._view = view; }} onLayout={this._onLayout}>
        <Animated.View key="divider" style={{height: animatedDividerHeight}} />
        <Animated.View key="item" style={{height: animatedItemHeight, opacity: animatedItemOpacity}}>
          {item}
        </Animated.View>
      </View>
    );

    return this._cachedElement;
  }
});

export default SortableListRowContainer;
