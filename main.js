'use strict';

import React, {
  AppRegistry,
  Dimensions,
  ListView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const TouchableComponent = TouchableOpacity;

import range from 'lodash/range';
import reinsert from './reinsert';
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
    let { labelFormat, labelText, ...onPressHandlers } = sortableProps;

    return (
      <TouchableComponent
        activeOpacity={0.3}
        key={`item-${this.props.id}`}
        delayLongPress={200}
        {...onPressHandlers}
        onPress={() => { this._handleFocus() }}>
        <View
          style={styles.row}
          pointerEvents={this.state.isFocused ? 'auto' : 'none'}>
          <View style={styles.labelContainer}>
            { labelFormat === 'bullet' &&
              <View style={styles.bullet} /> }

            { labelFormat === 'number' &&
              <View style={styles.number}>
                <Text>{labelText}</Text>
              </View> }
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

    let order = [];
    let items = range(15).reduce((result, i) => {
      let key = `id-${i}`
      order.push(key);
      result[key] = {text: DATA[i]}
      return result;
    }, {});

    this.state = {
      items,
      order,
      format: 'bullet',
    };
  }

  render() {
    return (
      <View style={{flex: 1, backgroundColor: '#eee',}}>
        <SortableListView
          items={this.state.items}
          renderHeader={this._renderHeader.bind(this)}
          onChangeOrder={this._handleOrderChange.bind(this)}
          order={this.state.order}
          renderRow={this._renderRow}
          labelFormat={this.state.format}
        />
      </View>
    );
  }

  _renderHeader() {
    let { format } = this.state;
    let isBulletFormat = format === 'bullet';
    let isNumberFormat = format === 'number';

    return (
      <View style={{backgroundColor: '#eee', height: 300, alignItems: 'center', justifyContent: 'center', paddingTop: 25, flex: 1}}>
        <Text style={{fontSize: 30, color: '#888'}}>
          Big fancy header!
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => this.setState({format: 'bullet'})}
            style={[styles.button, isBulletFormat && styles.selectedButton]}>
            <Text style={styles.buttonText}>Use bullets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => this.setState({format: 'number'})}
            style={[styles.button, isNumberFormat && styles.selectedButton]}>
            <Text style={styles.buttonText}>Use numbers</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  _handleOrderChange(id, newIndex) {
    let order = reinsert(
      this.state.order,
      this.state.order.indexOf(id),
      newIndex,
    );

    this.setState({order});
  }

  _renderRow(item, rowId, props) {
    return (
      <ListItem
        key={rowId}
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
    height: 90,
    flex: 1,
    borderColor: '#eee',
    borderBottomWidth: 1,
    backgroundColor: '#fff',
  },
  actions: {
    marginHorizontal: 15,
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    flexDirection: 'row',
  },
  button: {
    padding: 15,
    backgroundColor: '#888',
    borderRadius: 5,
    margin: 5,
  },
  selectedButton: {
    backgroundColor: '#000',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
  },
  labelContainer: {
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

const DATA = [
  "Ulysses has been labeled dirty, blasphemous, and unreadable. In a famous 1933",
  "court decision, Judge John M. Woolsey declared it an emetic book--although he",
  "found it sufficiently unobscene to allow its importation into the United",
  "States--and H. G. Wells was moved to decry James Joyce's 'cloacal obsession.'",
  "None of these adjectives, however, do the slightest justice to the novel. To",
  "this day it remains the modernist masterpiece, in which the author takes both",
  "Celtic lyricism and vulgarity to splendid extremes. It is funny, sorrowful, and",
  "even (in a close-focus sort of way) suspenseful. And despite the exegetical",
  "industry that has sprung up in the last 75 years, Ulysses is also a",
  "compulsively readable book. Even the verbal vaudeville of the final chapters",
  "can be navigated with relative ease, as long as you're willing to be buffeted,",
  "tickled, challenged, and (occasionally) vexed by Joyce's sheer command of the",
  "English language.  Among other things, a novel is simply a long story, and the",
  "first question about any story is: What happens? In the case of Ulysses, the",
  "answer might be Everything. William Blake, one of literature's sublime myopics,",
  "saw the universe in a grain of sand. Joyce saw it in Dublin, Ireland, on June",
  "16, 1904, a day distinguished by its utter normality. Two characters, Stephen",
  "Dedalus and Leopold Bloom, go about their separate business, crossing paths",
  "with a gallery of indelible Dubliners. We watch them teach, eat, stroll the",
  "streets, argue. And thanks to the books",
  "stream-of-consciousness technique--which suggests no mere stream but an",
  "impossibly deep, swift-running river--we're privy to their thoughts, emotions,",
  "and memories. The result? Almost every variety of human experience is crammed",
  "into the accordian folds of a single day, which makes Ulysses not just an",
  "experimental work but the very last word in realism.",
]

AppRegistry.registerComponent('sortexp', () => DraggableExample);
