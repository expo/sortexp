export default function reinsert(originalArray, fromIndex, toIndex) {
  let array = originalArray.slice();
  console.log({
    fromIndex,
    toIndex,
  });

  if (fromIndex < toIndex) {
    toIndex = toIndex - 1;
  }

  array.splice(toIndex, 0, array.splice(fromIndex, 1)[0] );
  return array;
}
