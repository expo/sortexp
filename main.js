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

class Row extends React.Component {

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
          {this.props.number}
        </Text>
      </View>
    );
  }

}

class DraggableExample extends React.Component {
  constructor(props, context) {
    super(props, context);

    let rowCount = 10;

    this.state = {
      rowCount,
      order: range(rowCount),
    };
  }

  render() {
    let { rowCount, order } = this.state;

    return (
      <ScrollView
        style={{marginTop: 25}}
        contentContainerStyle={{paddingTop: 10, height: itemHeightWithSpace * rowCount}}>
        {range(rowCount).map(i => {
          let style = {
            scale: spring(1),
            elevation: spring(0),
            y: spring(order.indexOf(i) * itemHeightWithSpace),
          };

          return (
            <Motion style={style} key={i}>
              {({scale, elevation, y}) => {
                return (
                  <View
                    elevation={elevation}
                    style={[
                      styles.draggableRowWrapper,
                      {
                        top: y,
                        transform: [{scale}]
                      },
                     ]}>
                    <Row number={i+1} />
                  </View>
                );
              }}
            </Motion>
          );
        })}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  draggableRowWrapper: {
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
