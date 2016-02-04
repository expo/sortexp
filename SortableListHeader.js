import React, {
  PropTypes,
  View,
} from 'react-native';

import { shallowEquals } from 'ShallowEquals';
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
      <View key="header" onLayout={this.props.onLayout}>
        {this.props.renderHeader && this.props.renderHeader()}
        {this.state.dividerIsVisible && this.props.renderDivider()}
      </View>
    );
  }
});

export default SortableListHeader;
