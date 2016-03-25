import React, {
  PropTypes,
  View,
} from 'react-native';

import { shallowEquals } from './ShallowEquals';
import Constants from './SortableListViewConstants';

const { HEADER_ROW_ID } = Constants;

const SortableListHeader = React.createClass({

  propTypes: {
    renderDivider: PropTypes.func.isRequired,
    renderHeader: PropTypes.func,
    onLayout: PropTypes.func.isRequired,
  },

  getInitialState() {
    return {
      dividerIsVisible: false,
    };
  },

  componentWillMount() {
    let updateHoverState = () => {
      if (this.props.sharedListData.getState().hoveredRowId === HEADER_ROW_ID) {
        this.setState({dividerIsVisible: true});
      } else {
        this.setState({dividerIsVisible: false});
      }
    }

    this._unsubscribe = this.props.sharedListData.subscribe(updateHoverState);
    updateHoverState();
  },

  componentWillUnmount() {
    this._unsubscribe && this._unsubscribe();
    this._unsubscribe = null;
  },

  render() {
    return (
      <View key="header" onLayout={this._onLayout}>
        {this.props.renderHeader && this.props.renderHeader()}
        {this.state.dividerIsVisible && this.props.renderDivider()}
      </View>
    );
  },

  _onLayout(layout) {
    // Don't update layout if it's just as a result of divider showing up
    if (!this.state.dividerIsVisible) {
      this.props.onLayout(layout);
    }
  },
});

export default SortableListHeader;
