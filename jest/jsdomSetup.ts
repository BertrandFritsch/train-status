// complete the missing jsdom objects
// tslint:disable max-classes-per-file class-name variable-name no-empty

class SVGMatrix_ implements SVGMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;

  constructor(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
  }

  flipX() {
    return this;
  }

  flipY() {
    return this;
  }

  inverse() {
    return this;
  }

  multiply(secondMatrix: SVGMatrix_) {
    return this;
  }

  rotate(angle: number) {
    return this;
  }

  rotateFromVector(x: number, y: number) {
    return this;
  }

  scale(scaleFactor: number) {
    return this;
  }

  scaleNonUniform(scaleFactorX: number, scaleFactorY: number) {
    return this;
  }

  skewX(angle: number) {
    return this;
  }

  skewY(angle: number) {
    return this;
  }

  translate(x: number, y: number) {
    return this;
  }
}

const IdentityMatrix = new SVGMatrix_(1, 0, 0, 1, 0, 0);

class SVGTransform_ implements  SVGTransform {
  readonly angle: number;
  readonly matrix: SVGMatrix_;
  readonly type: number;

  readonly SVG_TRANSFORM_UNKNOWN: number = 0;
  readonly SVG_TRANSFORM_MATRIX: number = 1;
  readonly SVG_TRANSFORM_TRANSLATE: number = 2;
  readonly SVG_TRANSFORM_SCALE: number = 3;
  readonly SVG_TRANSFORM_ROTATE: number = 4;
  readonly SVG_TRANSFORM_SKEWX: number = 5;
  readonly SVG_TRANSFORM_SKEWY: number = 6;

  constructor(angle: number, matrix: SVGMatrix_, type: number = 0) {
    this.angle = angle;
    this.matrix = matrix;
    this.type = type;
  }

  setMatrix(matrix: SVGMatrix_) {
    return;
  }

  setRotate(angle: number, cx: number, cy: number) {
    return;
  }

  setScale(sx: number, sy: number) {
    return;
  }

  setSkewX(angle: number) {
    return;
  }

  setSkewY(angle: number) {
    return;
  }

  setTranslate(tx: number, ty: number) {
    return;
  }
}

const IdentityTransform = new SVGTransform_(0, IdentityMatrix);

// tslint:disable-next-line max-classes-per-file
class SVGTransformList_ implements  SVGTransformList {
  private items: SVGTransform[] = [ ];

  constructor(items?: SVGTransform[]) {
    if (items) {
      this.items = [ ...items ];
    }
  }

  get numberOfItems() {
    return this.items.length;
  }

  appendItem(newItem: SVGTransform) {
    this.items.push(newItem);
    return newItem;
  }

  clear() {
    this.items = [];
  }

  consolidate() {
    return IdentityTransform;
  }

  createSVGTransformFromMatrix(matrix: SVGMatrix_) {
    return IdentityTransform;
  }

  getItem(index: number) {
    return this.items[ index ];
  }

  initialize(newItem: SVGTransform_) {
    return IdentityTransform;
  }

  insertItemBefore(newItem: SVGTransform_, index: number) {
    return IdentityTransform;
  }

  removeItem(index: number) {
    return IdentityTransform;
  }

  replaceItem(newItem: SVGTransform_, index: number) {
    return IdentityTransform;
  }
}

class SVGPoint_ implements SVGPoint {
  x: number;
  y: number;
  matrixTransform(matrix: SVGMatrix_) {
    const pt = new SVGPoint_();
    pt.x = this.x;
    pt.y = this.y;
    return pt;
  }
}

class SVGRect_ implements SVGRect {
  height: number;
  width: number;
  x: number;
  y: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

class SVGAnimatedTransformList_ implements SVGAnimatedTransformList {
  readonly animVal: SVGTransformList;
  readonly baseVal: SVGTransformList;

  constructor(baseVal: SVGTransformList, animVal?: SVGTransformList) {
    this.baseVal = baseVal;
    this.animVal = animVal || baseVal;
  }
}

const IdentityTransformList = new SVGAnimatedTransformList_(new SVGTransformList_());

class WheelEvent_ extends MouseEvent implements WheelEvent {
  readonly deltaMode: number;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaZ: number;
  readonly wheelDelta: number;
  readonly wheelDeltaX: number;
  readonly wheelDeltaY: number;
  readonly DOM_DELTA_LINE: number;
  readonly DOM_DELTA_PAGE: number;
  readonly DOM_DELTA_PIXEL: number;

  constructor(typeArg: string, eventInitDict?: WheelEventInit) {
    super(typeArg, eventInitDict);

    if (eventInitDict) {
      this.deltaMode = eventInitDict.deltaMode ? eventInitDict.deltaMode : 0;
      this.deltaX = eventInitDict.deltaX ? eventInitDict.deltaX : 0;
      this.deltaY = eventInitDict.deltaY ? eventInitDict.deltaY : 0;
      this.deltaZ = eventInitDict.deltaZ ? eventInitDict.deltaZ : 0;
    }
  }

  getCurrentPoint(element: Element) {
    return;
  }
  initWheelEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window, detailArg: number, screenXArg: number, screenYArg: number, clientXArg: number, clientYArg: number, buttonArg: number, relatedTargetArg: EventTarget, modifiersListArg: string, deltaXArg: number, deltaYArg: number, deltaZArg: number, deltaMode: number) {
    return;
  }
}

// Overwrite getBoundingClientRect to make sure we can draw
Element.prototype.getBoundingClientRect = () =>
  ({top: 0, left: 0, right: 1000, bottom: 1000, width: 1000, height: 1000});

Object.defineProperty(Element.prototype, 'clientWidth', {
  get() {
    return 1000;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(Element.prototype, 'clientHeight', {
  get() {
    return 1000;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  get() {
    return 1000;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  get() {
    return 1000;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(CSSStyleDeclaration.prototype, 'borderTopWidth', {
  get() {
    return 0;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(CSSStyleDeclaration.prototype, 'borderRightWidth', {
  get() {
    return 0;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(CSSStyleDeclaration.prototype, 'borderBottomWidth', {
  get() {
    return 0;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(CSSStyleDeclaration.prototype, 'borderLeftWidth', {
  get() {
    return 0;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(CSSStyleDeclaration.prototype, 'marginTop', {
  get() {
    return 0;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(CSSStyleDeclaration.prototype, 'marginRight', {
  get() {
    return 0;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(CSSStyleDeclaration.prototype, 'marginBottom', {
  get() {
    return 0;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(CSSStyleDeclaration.prototype, 'marginLeft', {
  get() {
    return 0;
  },
  enumerable: true,
  configurable: true
});

// Add SVG attributes and functions
(Element.prototype as SVGGraphicsElement).getCTM = () => IdentityMatrix;

// Add SVG attributes and functions
(Element.prototype as SVGGraphicsElement).getScreenCTM = () => IdentityMatrix;

(Element.prototype as SVGGraphicsElement).getBBox = () => new SVGRect_(0, 0, 100, 100);

(Element.prototype as SVGSVGElement).createSVGPoint = () => new SVGPoint_();

Object.defineProperty(Element.prototype, 'transform', {
  get(this: Element) {
    const transform = this.getAttribute('transform')!;

    // [ [ translate | scale ]( <number> [, <number> ] ) ... ]
    const transformRe = /\s*(translate|scale)\(\s*(?:(-?\d+(?:\.\d+)?)(?:\s*,\s*(-?\d+(?:\.\d+)?))?)\s*\)\s*/g;
    const matches = [];
    // tslint:disable-next-line no-conditional-assignment
    for (let match = null; match = transformRe.exec(transform); ) {
      matches.push(match);
    }

    const transformList = matches.map(m => {
      switch (m[ 1 ]) {
        case 'translate':
          return new SVGTransform_(0, new SVGMatrix_(1, 0, 0, 1, parseFloat(m[ 2 ]), m[ 3 ] ? parseFloat(m[ 3 ]) : 0), IdentityTransform.SVG_TRANSFORM_TRANSLATE);

        case 'scale': {
          const a = parseFloat(m[ 2 ]);
          const d = m[ 3 ] ? parseFloat(m[ 3 ]) : a;
          return new SVGTransform_(0, new SVGMatrix_(a, 0, 0, d, 0, 0), IdentityTransform.SVG_TRANSFORM_SCALE);
        }

        default:
          throw new Error('Unsupported case!');
      }
    });

    return new SVGAnimatedTransformList_(new SVGTransformList_(transformList));
  },
  set() {
    return;
  },
  enumerable: true,
  configurable: true
});

Object.defineProperty(Window.prototype, 'WheelEvent', {
  get() {
    return WheelEvent_;
  },
  enumerable: true,
  configurable: true
});

// -----------------
// Range

class Range_ implements Range {
  private _endContainer: Node = window.document.documentElement;
  private _startContainer: Node = window.document.documentElement;

  private _endOffset: number = 0;
  private _startOffset: number = 0;

  get END_TO_END() {
    return 0;
  }

  get END_TO_START() {
    return 0;
  }

  get START_TO_END() {
    return 0;
  }

  get START_TO_START() {
    return 0;
  }

  get collapsed() {
    return false;
  }

  get commonAncestorContainer() {
    return window.document.documentElement;
  }

  get endContainer() {
    return this._endContainer;
  }

  get endOffset() {
    return this._endOffset;
  }

  get startContainer() {
    return this._startContainer;
  }

  get startOffset() {
    return this._startOffset;
  }

  cloneContents() {
    return new DocumentFragment();
  }

  cloneRange() {
    return this;
  }

  collapse(toStart: boolean) {

  }

  compareBoundaryPoints(how: number, sourceRange: Range) {
    return 0;
  }

  createContextualFragment(fragment: string) {
    return new DocumentFragment();
  }

  deleteContents() {

  }

  detach() {

  }

  expand(Unit: ExpandGranularity) {
    return true;
  }

  extractContents() {
    return new DocumentFragment();
  }

  getBoundingClientRect() {
    return new ClientRect();
  }

  getClientRects() {
    return new ClientRectList();
  }

  insertNode(newNode: Node) {

  }

  selectNode(refNode: Node) {

  }

  selectNodeContents(refNode: Node) {

  }

  setEnd(refNode: Node, offset: number) {
    this._endContainer = refNode;
    this._endOffset = offset;
  }

  setEndAfter(refNode: Node) {

  }

  setEndBefore(refNode: Node) {

  }

  setStart(refNode: Node, offset: number) {
    this._startContainer = refNode;
    this._startOffset = offset;
  }

  setStartAfter(refNode: Node) {

  }

  setStartBefore(refNode: Node) {

  }

  surroundContents(newParent: Node) {

  }

  toString() {
    return 'Range object';
  }
}

(Document.prototype as any).createRange = () => new Range_();
