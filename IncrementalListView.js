/**
 * @providesModule IncrementalListView
 */
'use strict';

var InteractionManager = require('InteractionManager');
var LayoutAnimation = require('LayoutAnimation');
var ListViewDataSource = require('ListViewDataSource');
var RCTScrollViewManager = require('NativeModules').ScrollViewManager;
var React = require('React');
var ScrollResponder = require('ScrollResponder');
var ScrollView = require('ScrollView');
var StaticRenderer = require('StaticRenderer');
var TimerMixin = require('react-timer-mixin');
var View = require('View');

var isEmpty = require('isEmpty');
var logError = require('logError');
var merge = require('merge');

var PropTypes = React.PropTypes;

var DEFAULT_PAGE_SIZE = 1;
var DEFAULT_INITIAL_ROWS = 6;
var DEFAULT_SCROLL_RENDER_AHEAD = 1000;
var DEFAULT_END_REACHED_THRESHOLD = 1000;
var DEFAULT_SCROLL_CALLBACK_THROTTLE = 50;
var SCROLLVIEW_REF = 'listviewscroll';

var DEBUG = false;

InteractionManager.setDeadline(30);

var IncrementalListView = React.createClass({
  mixins: [ScrollResponder.Mixin, TimerMixin],

  statics: {
    DataSource: ListViewDataSource,
  },

  propTypes: {
    ...ScrollView.propTypes,

    dataSource: PropTypes.instanceOf(ListViewDataSource).isRequired,
    renderSeparator: PropTypes.func,
    renderRow: PropTypes.func.isRequired,
    pageSize: PropTypes.number,
    initialListSize: PropTypes.number,

    onEndReached: PropTypes.func,
    onEndReachedThreshold: PropTypes.number,
    renderFooter: PropTypes.func,
    renderHeader: PropTypes.func,
    renderSectionHeader: PropTypes.func,
    renderScrollComponent: React.PropTypes.func.isRequired,
    scrollRenderAheadDistance: React.PropTypes.number,
    onChangeVisibleRows: React.PropTypes.func,
    removeClippedSubviews: React.PropTypes.bool,
    stickyHeaderIndices: PropTypes.arrayOf(PropTypes.number),
  },

  /**
   * Exports some data, e.g. for perf investigations or analytics.
   */
  getMetrics: function() {
    return {
      contentLength: this.scrollProperties.contentLength,
      totalRows: this.props.dataSource.getRowCount(),
      renderedRows: this.state.curRenderedRowsCount,
      visibleRows: Object.keys(this._visibleRows).length,
    };
  },

  /**
   * Provides a handle to the underlying scroll responder to support operations
   * such as scrollTo.
   */
  getScrollResponder: function() {
    return this.refs[SCROLLVIEW_REF] &&
      this.refs[SCROLLVIEW_REF].getScrollResponder &&
      this.refs[SCROLLVIEW_REF].getScrollResponder();
  },

  scrollTo: function(destY, destX) {
    this.getScrollResponder().scrollResponderScrollTo(destX || 0, destY || 0);
  },

  setNativeProps: function(props) {
    this.refs[SCROLLVIEW_REF].setNativeProps(props);
  },

  /**
   * React life cycle hooks.
   */

  getDefaultProps: function() {
    return {
      initialListSize: DEFAULT_INITIAL_ROWS,
      pageSize: DEFAULT_PAGE_SIZE,
      renderScrollComponent: props => <ScrollView {...props} />,
      scrollRenderAheadDistance: DEFAULT_SCROLL_RENDER_AHEAD,
      onEndReachedThreshold: DEFAULT_END_REACHED_THRESHOLD,
      stickyHeaderIndices: [],
    };
  },

  getInitialState: function() {
    return {
      curRenderedRowsCount: this.props.initialListSize,
      currentBatch: {
        firstRow: 0,
        lastRow: this.props.initialListSize - 1,
        numRows: this.props.initialListSize,
        isComplete: false,
      },
      highlightedRow: {},
    };
  },

  getInnerViewNode: function() {
    return this.refs[SCROLLVIEW_REF].getInnerViewNode();
  },

  componentWillMount: function() {
    if (this.props.initialListSize <= 0) {
      throw new Error('Initial list size must be greater than 0');
    }

    // this data should never trigger a render pass, so don't put in state
    this.scrollProperties = {
      visibleLength: null,
      contentLength: null,
      offset: 0
    };

    this._childFrames = [];
    this._visibleRows = {};
    this._prevRenderedRowsCount = 0;
    this._sentEndForContentLength = null;
  },

  componentDidMount: function() {
    // do this in animation frame until componentDidMount actually runs after
    // the component is laid out
    this.requestAnimationFrame(() => {
      this._measureAndUpdateScrollProps();
    });
  },

  componentWillReceiveProps: function(nextProps) {
    if (this.props.dataSource !== nextProps.dataSource) {
      this._prevRenderedRowsCount = 0;
      this._pageInNewRows();
    }
  },

  shouldComponentUpdate(nextProps, nextState) {
    if (this.__hackyDoNotUpdate) {
      this.__hackyDoNotUpdate = false;
      return false;
    }

    return true;
  },

  componentDidUpdate: function() {
    this.requestAnimationFrame(() => {
      this._measureAndUpdateScrollProps();
    });
  },

  onRowHighlighted: function(sectionID, rowID) {
    this.setState({highlightedRow: {sectionID, rowID}});
  },

  render: function() {
    var bodyComponents = [];

    var dataSource = this.props.dataSource;
    var allRowIDs = dataSource.rowIdentities;
    var rowCount = 0;
    var sectionHeaderIndices = [];

    var header = this.props.renderHeader && this.props.renderHeader();
    var footer = this.props.renderFooter && this.props.renderFooter();
    var totalIndex = header ? 1 : 0;

    for (var sectionIdx = 0; sectionIdx < allRowIDs.length; sectionIdx++) {
      var sectionID = dataSource.sectionIdentities[sectionIdx];
      var rowIDs = allRowIDs[sectionIdx];
      if (rowIDs.length === 0) {
        continue;
      }

      if (this.props.renderSectionHeader) {
        var shouldUpdateHeader = rowCount >= this._prevRenderedRowsCount &&
          dataSource.sectionHeaderShouldUpdate(sectionIdx);
        bodyComponents.push(
          <StaticRenderer
            key={'s_' + sectionID}
            shouldUpdate={!!shouldUpdateHeader}
            render={this.props.renderSectionHeader.bind(
              null,
              dataSource.getSectionHeaderData(sectionIdx),
              sectionID
            )}
          />
        );
        sectionHeaderIndices.push(totalIndex++);
      }

      for (var rowIdx = 0; rowIdx < rowIDs.length; rowIdx++) {
        var rowID = rowIDs[rowIdx];
        var comboID = sectionID + '_' + rowID;
        var key = 'r_' + comboID;

        var shouldUpdateRow = rowCount >= this._prevRenderedRowsCount &&
          dataSource.rowShouldUpdate(sectionIdx, rowIdx);

        var row =
          <StaticRenderer
            key={key}
            shouldUpdate={!!shouldUpdateRow}
            render={this._renderRow.bind(
              this,
              key,
              rowIdx,
              sectionIdx,
              sectionID,
              rowID,
              this.onRowHighlighted
            )}
          />;
        bodyComponents.push(row);
        totalIndex++;

        if (this.props.renderSeparator &&
            (rowIdx !== rowIDs.length - 1 || sectionIdx === allRowIDs.length - 1)) {
          var adjacentRowHighlighted =
            this.state.highlightedRow.sectionID === sectionID && (
              this.state.highlightedRow.rowID === rowID ||
              this.state.highlightedRow.rowID === rowIDs[rowIdx + 1]
            );

          var separator = this._renderSeparator(
            rowIdx,
            sectionIdx,
            sectionID,
            rowID,
            adjacentRowHighlighted
          );

          bodyComponents.push(separator);
          totalIndex++;
        }
        if (++rowCount === this.state.curRenderedRowsCount) {
          break;
        }
      }
      if (rowCount >= this.state.curRenderedRowsCount) {
        break;
      }
    }

    var {
      renderScrollComponent,
      ...props,
    } = this.props;
    if (!props.scrollEventThrottle) {
      props.scrollEventThrottle = DEFAULT_SCROLL_CALLBACK_THROTTLE;
    }
    if (props.removeClippedSubviews === undefined) {
      props.removeClippedSubviews = true;
    }
    Object.assign(props, {
      onScroll: this._onScroll,
      stickyHeaderIndices: this.props.stickyHeaderIndices.concat(sectionHeaderIndices),

      // Do not pass these events downstream to ScrollView since they will be
      // registered in ListView's own ScrollResponder.Mixin
      onKeyboardWillShow: undefined,
      onKeyboardWillHide: undefined,
      onKeyboardDidShow: undefined,
      onKeyboardDidHide: undefined,
    });

    // TODO(ide): Use function refs so we can compose with the scroll
    // component's original ref instead of clobbering it
    return React.cloneElement(renderScrollComponent(props), {
      ref: SCROLLVIEW_REF,
      onContentSizeChange: this._onContentSizeChange,
      onLayout: this._onLayout,
    }, header, bodyComponents, footer);
  },

  /**
   * Private methods
   */

  _isBatchComplete(rowIdx) {
    if (rowIdx < this.state.currentBatch.firstRow || rowIdx > this.state.currentBatch.lastRow) {
      return true;
    } else {
      return this.state.currentBatch.isComplete;
    }
  },

  _onRenderRow(rowIdx, isLastRow) {
    if (isLastRow) {
      InteractionManager.runAfterInteractions({
        name: 'Present batch',
        gen: () => new Promise(resolve => {
          this.__hackyDoNotUpdate = true;
          this.setState((state) => ({
            currentBatch: {
              ...state.currentBatch,
              isComplete: true,
            },
          }));

          // Use setNativeProps to present the batch rather than a full
          // re-render, less jank
          this._presentCurrentBatch();
          this.props.onPresentBatch && this.props.onPresentBatch();
          resolve();
        }),
      });
    }
  },

  _presentCurrentBatch() {
    let {
      firstRow,
      lastRow,
      isPrepending,
    } = this.state.currentBatch;

    var dataSource = this.props.dataSource;
    var sectionIdx = 0;
    if (dataSource.sectionIdentities.length > 1) {
      console.warn('You cannot have more than one section with IncrementalListView right now!');
    }

    // Fade the batch in
    LayoutAnimation.linear();

    var allRowIDs = this.props.dataSource.rowIdentities[0];
    for (var i = firstRow; i <= lastRow; i++) {
      let rowID = allRowIDs[i];
      this._rowRefs && this._rowRefs[rowID] && this._rowRefs[rowID].batchIsComplete();
      this._separatorRefs && this._separatorRefs[rowID] && this._separatorRefs[rowID].batchIsComplete();
    }

    // Fire onPrependRows or onAppendRows callback
    let callbackOpts = {
      numRows: this.state.currentBatch.numRows,
      scrollProperties: this.scrollProperties,
      lastScrollTimeStamp: this._lastScrollTimeStamp,
    }

    if (isPrepending) {
      requestAnimationFrame(() => {
        this.props.onPrependRows && this.props.onPrependRows(callbackOpts);
      });
    } else {
      requestAnimationFrame(() => {
        this.props.onAppendRows && this.props.onAppendRows(callbackOpts);
      });
    }
  },

  _renderSeparator(rowIdx, sectionIdx, sectionID, rowID, adjacentRowHighlighted) {
    this._separatorRefs = this._separatorRefs || {};

    return (
      <IncrementalSeparatorRenderer
        isBatchComplete={this._isBatchComplete(rowIdx)}
        key={'sp_' + rowID}
        ref={view => { this._separatorRefs[rowID] = view; }}
        render={this.props.renderSeparator.bind(null, sectionID, rowID, adjacentRowHighlighted)}
        synchronous={this.state.currentBatch.firstRow === 0}
      />
    );
  },

  _renderRow(key, rowIdx, sectionIdx, sectionID, rowID, onRowHighlighted) {
    this._rowRefs = this._rowRefs || {};

    let rowData = this.props.dataSource.getRowData(sectionIdx, rowIdx);
    let sectionLength = this.props.dataSource.getSectionLengths()[sectionIdx];
    let isLastRow = rowIdx === this.state.currentBatch.lastRow;

    return (
      <IncrementalRowRenderer
        isBatchComplete={this._isBatchComplete(rowIdx)}
        onRender={() => { this._onRenderRow(rowIdx, isLastRow) }}
        ref={view => { this._rowRefs[rowID] = view; }}
        render={this.props.renderRow.bind(null, rowData, sectionID, rowID, onRowHighlighted)}
        rowID={rowID}
        synchronous={this.state.currentBatch.firstRow === 0}
      />
    );
  },

  _measureAndUpdateScrollProps: function() {
    var scrollComponent = this.getScrollResponder();
    if (!scrollComponent || !scrollComponent.getInnerViewNode) {
      return;
    }
  },

  _onContentSizeChange: function(width, height) {
    var contentLength = !this.props.horizontal ? height : width;
    if (contentLength !== this.scrollProperties.contentLength) {
      this.scrollProperties.contentLength = contentLength;
      this._renderMoreRowsIfNeeded();
    }
    this.props.onContentSizeChange && this.props.onContentSizeChange(width, height);
  },

  _onLayout: function(event) {
    var {width, height} = event.nativeEvent.layout;
    var visibleLength = !this.props.horizontal ? height : width;
    if (visibleLength !== this.scrollProperties.visibleLength) {
      this.scrollProperties.visibleLength = visibleLength;
      this._renderMoreRowsIfNeeded();
    }
    this.props.onLayout && this.props.onLayout(event);
  },

  _maybeCallOnEndReached: function(event) {
    if (this.props.onEndReached &&
        this.scrollProperties.contentLength !== this._sentEndForContentLength &&
        this._getDistanceFromEnd(this.scrollProperties) < this.props.onEndReachedThreshold &&
        this.state.curRenderedRowsCount === this.props.dataSource.getRowCount()) {
      this._sentEndForContentLength = this.scrollProperties.contentLength;
      this.props.onEndReached(event);
      return true;
    }
    return false;
  },

  _renderMoreRowsIfNeeded: function() {
    if (this.scrollProperties.contentLength === null ||
      this.scrollProperties.visibleLength === null ||
      this.state.curRenderedRowsCount === this.props.dataSource.getRowCount()) {
      this._maybeCallOnEndReached();
      return;
    }

    var distanceFromEnd = this._getDistanceFromEnd(this.scrollProperties);
    if (distanceFromEnd < this.props.scrollRenderAheadDistance) {
      this._pageInNewRows();
    }
  },

  _pageInNewRows: function() {
    if (!this.state.currentBatch.isComplete) {
      return false;
    }

    this.setState((state, props) => {
      // If our curRenderedRowsCount is greater than
      // dataSource count, we need to limit it
      var currentRows = Math.min(
        props.dataSource.getRowCount(),
        this.state.curRenderedRowsCount,
      );

      var rowsToRender = Math.min(
        currentRows + props.pageSize,
        props.dataSource.getRowCount()
      );

      var numRowsAdded = Math.max(
        0,
        rowsToRender - state.curRenderedRowsCount
      );

      this._prevRenderedRowsCount = state.curRenderedRowsCount;
      this._currentBatchCount = 0;

      // The problem here comes from the fact that firstRow and
      // lastRow are not necessarily reflecting where they are in the
      // ListView: firstRow can be row 0 and lastRow row 5 when adding
      // top the top of a list, or it can be 50 and 60 respectively
      // when adding to the bottom.
      //
      // The current way to get around this is to check if we have
      // already rendered the first row in the dataSource, if not
      // then we are prepending; if we have already rendered
      // the first row then we are appending.
      //
      let firstRow = 0;
      let lastRow = 0;
      let firstRowID = props.dataSource.rowIdentities[0][0];
      let isPrepending = false;

      if (this._rowRefs[firstRowID]) {
        firstRow = Math.max(0, currentRows - 1);
        lastRow = Math.max(0, currentRows - 1 + numRowsAdded);
      } else {
        for (var i = 1; i < props.dataSource.rowIdentities[0].length; i++) {
          let currRowID = props.dataSource.rowIdentities[0][i];
          if (!this._rowRefs[currRowID]) {
            lastRow = lastRow + 1;
          } else {
            break;
          }
        }

        isPrepending = true;
        numRowsAdded = lastRow - firstRow + 1;
      }

      return {
        currentBatch: {
          firstRow,
          lastRow,
          numRows: numRowsAdded,
          isComplete: firstRow === lastRow,
          isPrepending,
        },
        curRenderedRowsCount: rowsToRender
      };
    }, () => {
      this._measureAndUpdateScrollProps();
      this._prevRenderedRowsCount = this.state.curRenderedRowsCount;
    });
  },

  _getDistanceFromEnd: function(scrollProperties) {
    var maxLength = Math.max(
      scrollProperties.contentLength,
      scrollProperties.visibleLength
    );
    return maxLength - scrollProperties.visibleLength - scrollProperties.offset;
  },

  _onScroll: function(e) {
    // RecyclerViewBackedScrollView doesn't support all scroll events so we
    // will just onScroll timestamps to determine this when necessary
    this._lastScrollTimeStamp = e.timeStamp;

    var isVertical = !this.props.horizontal;
    this.scrollProperties.visibleLength = e.nativeEvent.layoutMeasurement[
      isVertical ? 'height' : 'width'
    ];
    this.scrollProperties.contentLength = e.nativeEvent.contentSize[
      isVertical ? 'height' : 'width'
    ];
    this.scrollProperties.offset = e.nativeEvent.contentOffset[
      isVertical ? 'y' : 'x'
    ];

    if (!this._maybeCallOnEndReached(e)) {
      this._renderMoreRowsIfNeeded();
    }

    if (this.props.onEndReached &&
        this._getDistanceFromEnd(this.scrollProperties) > this.props.onEndReachedThreshold) {
      // Scrolled out of the end zone, so it should be able to trigger again.
      this._sentEndForContentLength = null;
    }

    this.props.onScroll && this.props.onScroll(e);
  },
});

class IncrementalSeparatorRenderer extends React.Component {

  render() {
    let {
      isBatchComplete,
      synchronous,
    } = this.props;

    return (
      <View
        ref={view => { this._view = view; }}
        style={isBatchComplete || synchronous ? {} : {position: 'absolute', left: 0, right: 0, opacity: 0}}>
        {this.props.render()}
      </View>
    );
  }

  batchIsComplete() {
    if (this._view) {
      this._view.setNativeProps({style: {position: 'relative', opacity: 1}});
    }
  }
}

class IncrementalRowRenderer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      shouldRender: this.props.synchronous,
      isBatchComplete: this.props.isBatchComplete,
    };
  }

  batchIsComplete() {
    if (this._view) {
      this._view.setNativeProps({style: {position: 'relative', opacity: 1}});
    }
  }

  componentDidMount() {
    this._scheduleRender();
  }

  render() {
    if (this.state.shouldRender) {
      return (
        <View
          ref={view => { this._view = view; }}
          style={this.state.isBatchComplete || this.props.synchronous ? {} : {position: 'absolute', left: 0, right: 0, opacity: 0}}>
          {this.props.render()}
        </View>
      );
    } else {
      return null;
    }
  }

  _scheduleRender() {
    InteractionManager.runAfterInteractions({
      name: 'IncrementalListView row: ' + this.props.rowID,
      gen: () => new Promise(resolve => {
        this.setState({shouldRender: true}, resolve);
      }),
    }).then(() => {
      this.props.onRender && this.props.onRender();
    });
  }

}

module.exports = IncrementalListView;
