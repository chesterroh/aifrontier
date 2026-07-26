import { visit } from 'unist-util-visit';

// 30s lands the visible density at ~1.3-1.5 anchors per minute across ep103/105/106,
// which matches how the older, sparsely-anchored episodes actually read. 45s dropped
// to ~1.0/min; 20s climbed back toward the busy ladder we are trying to avoid.
const MIN_GAP_SECONDS = 30;

function parseTimestamp(value) {
  if (typeof value !== 'string') return null;

  const parts = value.split(':');
  if (parts.length !== 2 && parts.length !== 3) return null;
  if (!parts.every((part) => /^\d+$/.test(part))) return null;

  const numbers = parts.map(Number);
  const [hours, minutes, seconds] = parts.length === 3
    ? numbers
    : [0, numbers[0], numbers[1]];

  if (seconds >= 60 || (parts.length === 3 && minutes >= 60)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function getAttribute(node, name) {
  if (node.type === 'mdxJsxTextElement') {
    return node.attributes.find((attribute) => attribute.name === name)?.value;
  }

  const propertyName = name === 'class' ? 'className' : name === 'data-ts' ? 'dataTs' : name;
  return node.properties?.[propertyName];
}

function setAttribute(node, name, value) {
  if (node.type === 'mdxJsxTextElement') {
    const attribute = node.attributes.find((candidate) => candidate.name === name);
    if (attribute) {
      attribute.value = value;
    } else {
      node.attributes.push({ type: 'mdxJsxAttribute', name, value });
    }
    return;
  }

  const propertyName = name === 'class' ? 'className' : name === 'tabindex' ? 'tabIndex' : name;
  node.properties[propertyName] = value;
}

function hasClass(node, className) {
  const classes = getAttribute(node, 'class');
  return Array.isArray(classes)
    ? classes.includes(className)
    : typeof classes === 'string' && classes.split(/\s+/).includes(className);
}

function isTimestamp(node) {
  const isSpan = (
    (node.type === 'element' && node.tagName === 'span')
    || (node.type === 'mdxJsxTextElement' && node.name === 'span')
  );
  return isSpan && hasClass(node, 'paragraph-timestamp');
}

export default function rehypeTimestampVisibility() {
  return (tree) => {
    let isFirstAnchor = true;
    let isAfterChapterHeading = false;
    let lastVisibleSeconds = null;

    visit(tree, (node, index, parent) => {
      if (node.type === 'element' && node.tagName === 'h2') {
        isAfterChapterHeading = true;
        return;
      }

      if (
        !isTimestamp(node)
        || typeof index !== 'number'
        || !parent
      ) {
        return;
      }

      const seconds = parseTimestamp(getAttribute(node, 'data-ts'));
      const exceedsMinimumGap = (
        seconds !== null
        && lastVisibleSeconds !== null
        && seconds - lastVisibleSeconds >= MIN_GAP_SECONDS
      );
      const isVisible = (
        isFirstAnchor
        || isAfterChapterHeading
        || exceedsMinimumGap
      );

      if (isVisible) {
        const classValue = getAttribute(node, 'class');
        const classes = Array.isArray(classValue)
          ? classValue
          : String(classValue).split(/\s+/).filter(Boolean);
        setAttribute(node, 'class', [...new Set([...classes, 'is-visible'])].join(' '));
        if (seconds !== null) lastVisibleSeconds = seconds;
      }

      // Every timestamp remains in the HTML as complete seek data; only its display is thinned.
      setAttribute(node, 'tabindex', '0');
      isFirstAnchor = false;
      isAfterChapterHeading = false;
    });
  };
}
