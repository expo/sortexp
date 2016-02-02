'use strict';

import React, {
  AppRegistry,
  Dimensions,
  ListView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';

const TouchableComponent = TouchableOpacity;

import range from 'lodash/range';
import SortableListView from './SortableListView';

class ListItem extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      isFocused: false,
    };
  }

  render() {
    let { item, sortableProps } = this.props;

    return (
      <TouchableComponent
        {...sortableProps}
        onPress={() => { this._handleFocus() }}>
        <View
          style={styles.row}
          pointerEvents={this.state.isFocused ? 'auto' : 'none'}>
          <View style={styles.bulletContainer}>
            <View style={styles.bullet} />
          </View>

          <TextInput
            underlineColorAndroid="transparent"
            onFocus={this._handleFocus.bind(this)}
            onBlur={this._handleBlur.bind(this)}
            ref={view => { this._textInput = view; }}
            style={styles.textInput}
            value={item.text} />
        </View>
      </TouchableComponent>
    );
  }

  _handleFocus() {
    if (!this.state.isFocused) {
      this.setState({isFocused: true});
      requestAnimationFrame(() => {
        this._textInput.focus();
      });
    }
  }

  _handleBlur() {
    this.setState({isFocused: false});
  }

}

class DraggableExample extends React.Component {

  constructor(props) {
    super(props);

    let identities = [];
    let items = range(20).reduce((result, i) => {
      let key = `id-${i}`
      identities.push(key);
      result[key] = {text: i.toString()}
      return result;
    }, {});

    this.state = {
      items,
      identities,
    };
  }

  render() {
    return (
      <View style={{marginTop: 25, flex: 1,}}>
        <SortableListView
          renderRow={this._renderRow}
          items={this.state.items}
          sortOrder={this.state.identities}
        />
      </View>
    );
  }

  _renderRow(item, rowId, props) {
    return (
      <ListItem
        item={item}
        id={rowId}
        sortableProps={props}
      />
    );
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: 50,
    flex: 1,
    borderColor: '#eee',
    borderBottomWidth: 1,
    backgroundColor: '#fff',
  },
  bulletContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    marginLeft: 5,
    marginRight: 5,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  textInput: {
    flex: 1,
  },
});

AppRegistry.registerComponent('main', () => DraggableExample);
