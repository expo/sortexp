export default function reinsert(array, fromIndex, toIndex) {
  if (fromIndex < toIndex) {
    toIndex = toIndex - 1;
  }
  array.splice(toIndex, 0, array.splice(fromIndex, 1)[0] );
  return array;
}
