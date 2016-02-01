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

import reactMixin from 'react-mixin';
import TimerMixin from 'react-timer-mixin';

import clamp from './clamp';
import range from 'lodash/range';
import reinsert from './reinsert';

const spaceBetweenItems = 10;
const itemHeight = 70;
const itemWidth = Dimensions.get('window').width - 50;
const itemHeightWithSpace = itemHeight + spaceBetweenItems;

class Item extends React.Component {

  shouldComponentUpdate() {
    return false;
  }

  render() {
    return (
      <View
        style={{
          height: itemHeight,
          flex: 1,
          padding: 20,
          justifyContent: 'center',
          backgroundColor: '#fff',
          borderRadius: 15,
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
    let {
      rowCount,
      rows,
      order,
    } = this.state;

    let {
      getItemId,
    } = this.props;

    return (
      <ScrollView
        onScroll={() => { console.log('scroll') }}
        onScrollEnd={() => { console.log('scroll end') }}
        onScrollAnimationEnd={() => { console.log('animation end') }}
        onMomentumScrollEnd={() => { console.log('momentum scroll end') }}
        ref={view => { this._scrollView = view }}
        scrollEnabled={!this.state.isSorting}
        scrollEventThrottle={50}
        style={{marginTop: 25}}>
        <View
          style={{height: itemHeightWithSpace * rowCount, flex: 1, marginTop: 10}}
          collapsible={false}
          onStartShouldSetResponder={this._onStartShouldSetResponder.bind(this)}
          onResponderStart={this._onResponderStart.bind(this)}
          onResponderGrant={this._onResponderGrant.bind(this)}
          onResponderMove={this._onResponderMove.bind(this)}
          onResponderRelease={this._onResponderRelease.bind(this)}
          onResponderTerminate={this._onResponderTerminate.bind(this)}
          onResponderTerminationRequest={this._onResponderTerminationRequest.bind(this)}>
          {rows.map(item => this._renderItem(item, getItemId(item)))}
        </View>
      </ScrollView>
    );
  }

  _startSorting(itemId) {
    this.setState({
      isSorting: true,
      pressedItemId: 'id-0',
    });
  }

  _finishSorting() {
    this.setState({
      isSorting: false,
      pressedItemId: null,
    });
  }

  _onStartShouldSetResponder() {
    this._enableTimeout && this.clearTimeout(this._enableTimeout);
    this._disableTimeout && this.clearTimeout(this._disableTimeout);

    this._enableTimeout = this.setTimeout(() => {
      console.log('scroll disabled!');
      this.setState({isSorting: true});

      this._disableTimeout = this.setTimeout(() => {
        console.log('scroll enabled!');
        this.setState({isSorting: false});
      }, 5000);
    }, 1000);
    // this._touchStartTimeout = this.setTimeout(() => {
    //   this._startSorting(0);
    // }, 300);

    // return true;
  }

  _onResponderRelease() {
    this._maybeClearTouchStartTimeout();
    this._finishSorting();
  }

  _onResponderTerminate() {
    this._maybeClearTouchStartTimeout();
  }

  _onResponderTerminationRequest() {
    // console.log('request');
  }

  _maybeClearTouchStartTimeout() {
    this._isSorting = false;
    if (this._touchStartTimeout) {
      this.clearTimeout(this._touchStartTimeout);
      this._touchStartTimeout = null;
    }
  }

  _onResponderStart(e) {
    // console.log('start');
  }

  _onResponderGrant(e) {
    if (this._isSorting) {
      return true;
    }
  }

  _onResponderMove(e) {
    if (this._isSorting) {
      return true;
    }
  }

  _renderItem(item, itemId) {
    let {
      rowCount,
      rows,
      isSorting,
      pressedItemId,
      order,
    } = this.state;


    let style;

    if (isSorting && pressedItemId === itemId) {
      style = {
        scale: spring(1.05),
        elevation: spring(3),
        y: spring(order.indexOf(itemId) * itemHeightWithSpace),
      };
    } else {
      style = {
        scale: spring(1),
        elevation: spring(0),
        y: spring(order.indexOf(itemId) * itemHeightWithSpace),
      };
    }

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
    // console.log({
    //   itemId,
    //   height: itemLayout.height,
    // });
  }
}

reactMixin(SortableList.prototype, TimerMixin);

class DraggableExample extends React.Component {

  render() {
    let items = range(150).map((i) => {
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
