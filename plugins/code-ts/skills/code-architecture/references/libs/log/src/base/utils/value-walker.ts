import type { Log } from "#log/index.ts";

const CIRCULAR_TEXT = "[Circular]";

/**
 * Rebuilds `rootValue` through `convertNode`, which gets every value and the walk for the values
 * inside it; an object met again inside itself becomes `[Circular]` and is not walked twice.
 */
function walkValue(rootValue: unknown, convertNode: Log.ValueWalker.ConvertNode): unknown {
  const ancestorsSet = new Set<object>();

  const walkChild = (childValue: unknown): unknown => {
    if (childValue === null || typeof childValue !== "object") {
      return convertNode(childValue, walkChild);
    }

    if (ancestorsSet.has(childValue)) {
      return CIRCULAR_TEXT;
    }

    ancestorsSet.add(childValue);

    const convertedValue = convertNode(childValue, walkChild);

    ancestorsSet.delete(childValue);

    return convertedValue;
  };

  return walkChild(rootValue);
}

export default { walkValue };

declare module "@manro/lib-log" {
  namespace Log.ValueWalker {
    type WalkChild = (childValue: unknown) => unknown;

    /** Turns one value into its copy, walking each value it keeps inside through `walkChild`. */
    type ConvertNode = (nodeValue: unknown, walkChild: WalkChild) => unknown;
  }
}
