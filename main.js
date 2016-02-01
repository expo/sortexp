'use strict';

import React, {
  AppRegistry,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Motion,
  spring,
} from 'react-motion';

import clamp from './clamp';
import range from 'lodash/range';
import reinsert from './reinsert';

const spaceBetweenItems = 10;
const itemHeight = 90;
const itemWidth = Dimensions.get('window').width - 50;
const itemHeightWithSpace = itemHeight + spaceBetweenItems;

class Item extends React.Component {

  render() {
    return (
      <View
        style={{
          height: 90,
          flex: 1,
          padding: 20,
          justifyContent: 'center',
        }}>
        <Text>
          {this.props.text}
        </Text>
      </View>
    );
  }

}

class SortableList extends React.Component {
  constructor(props, context) {
    super(props, context);

    let rowCount = this.props.items.length;
    let rows = this.props.items;

    this.state = {
      rowCount,
      rows,
      order: rows.map(this.props.getItemId),
    };
  }

  render() {
    let { rowCount, rows, order } = this.state;
    let { getItemId } = this.props;

    return (
      <ScrollView
        style={{marginTop: 25}}
        contentContainerStyle={{marginTop: 10, height: itemHeightWithSpace * rowCount}}>
        {rows.map(item => this._renderItem(item, getItemId(item)))}
      </ScrollView>
    );
  }

  _renderItem(item, itemId) {
    let {
      rowCount,
      rows,
      order
    } = this.state;

    let style = {
      scale: spring(1),
      elevation: spring(0),
      y: spring(order.indexOf(itemId) * itemHeightWithSpace),
    };

    return (
      <Motion style={style} key={itemId}>
        {({scale, elevation, y}) => {
          return (
            <View
              onLayout={this._handleItemLayout.bind(this, itemId)}
              elevation={elevation}
              style={[styles.draggableItemWrapper, { top: y, transform: [{scale}] }]}>
              {this.props.renderItem(item, itemId)}
            </View>
          );
        }}
      </Motion>
    );
  }

  _handleItemLayout(itemId, {nativeEvent: {layout: itemLayout}}) {
    console.log({
      itemId,
      height: itemLayout.height,
    });
  }
}

class DraggableExample extends React.Component {

  render() {
    let items = range(10).map((i) => {
      return {
        guid: `id-${i}`,
        text: i.toString(),
      }
    });

    return (
      <SortableList
        onChangeOrder={this._handleChangeOrder.bind(this)}
        renderItem={this._renderItem}
        getItemId={(item) => item.guid}
        items={items} />
    );
  }

  _renderItem(item, itemId) {
    return (
      <Item text={item.text} />
    );
  }

  _handleChangeOrder(newOrder, previousOrder) {
    console.log(newOrder);
    console.log(previousOrder);
  }
}

const styles = StyleSheet.create({
  draggableItemWrapper: {
      position: 'absolute',
      width: itemWidth,
      marginBottom: 10,

      /* Would like to put this on the row.. But can't because of elevation
       * (you don't see any visual indication of elevation if no border on the
       * view that it's applied to) */
      borderColor: '#ccc',
      marginHorizontal: 25,
      borderRadius: 10,
      borderWidth: 1,
  },
});

AppRegistry.registerComponent('main', () => DraggableExample);
