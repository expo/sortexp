'use strict';

import React, {
  AppRegistry,
  Dimensions,
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
      <View style={{flex: 1, marginTop: 30,}}>
        {range(rowCount).map(i => {
          let style = {
            scale: spring(1),
            elevation: spring(1),
            y: spring(order.indexOf(i) * itemHeightWithSpace),
          };

          return (
            <Motion style={style} key={i}>
              {({scale, elevation, y}) => {
                return (
                  <View
                    elevation={elevation}
                    style={{
                      transform: [{scale}],
                      position: 'absolute',
                      width: itemWidth,
                      top: y,

                      /* Would like to put this on the row.. But can't because of elevation */
                      borderColor: '#ccc',
                      marginHorizontal: 25,
                      borderRadius: 10,
                      borderWidth: 1,
                    }}>
                    <Row number={i+1} />
                  </View>
                );
              }}
            </Motion>
          );
        })}
      </View>
    );
  }
}

const styles = StyleSheet.create({
});

AppRegistry.registerComponent('main', () => DraggableExample);
