# SortableListView

Performant way to list items that can be dragged to be re-ordered.

## Optimization strategies

- Renders all rows up front to avoid any jank in scrolling.
- Each rowDidUpdate *always returns false* for the internal data source.
  If you need to update your row, the data should be side-loaded.
  - The only updates that occur from changing props on the
    SortableListView are re-ordering the rows or adding/remove rows.
- The list view uses Redux to share state across the list and
  its rows, so the rows can update if they are hovered over, without
  going through setState on the ListView.

## Constraints

- Row data must be side loaded or you can't update it (as mentioned
  above, rowDidUpdate always returns false).
