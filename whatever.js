function getRow(matrix, index) {
  return matrix[index];
}

function getColumn(matrix, index) {
  return [
    ...matrix.map((row) => {
      return row[index];
    }),
  ];
}
function cross(m1, m2) {
  const arr = new Array(m1.length).fill("").map(() => []);
  if (m1[0].length === m2.length) {
    for (let i = 0; i < m1.length; i++) {
      const row = getRow(m1, i);
      for (let j = 0; j < m2[0].length; j++) {
        const column = getColumn(m2, j);
        arr[i][j] = row.reduce((prev, r, index) => {
          return prev + r * column[index];
        }, 0);
      }
    }
  }
  return arr;
}

function dot(v1, v2) {
  return v2.reduce((prev, cur, index) => prev + cur * v1[index]);
}

function Point(x, y) {
  return [x, y, 1];
}

function Vector(x, y) {
  return [x, y, 0];
}

function Matrix(...args) {
  return args.map((arg) => {
    if (arg[2]) {
      return arg;
    } else {
      return [arg[0], arg[1], arg[1]];
    }
  });
}

// 这里解释一下为什么两个点相加得到的是两个点的中点
// 是因为我们定义了点的列向量是[x,y,1]，假设p1：[x1,y1,1],p2：[x2,y2,1]
// 两个点相加之后结果：[x1+x2,y1+y2,2]，z变成2了，这不符合我们对点的定义
// 所以x,y,z要同时除以2，即[(x1+x2)/2, (y1+y2)/2, 1]
Point.add = function (p1, p2) {
  return Point((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2);
};

function Rotate(matrix, angle) {
  const rotateMatrix = [
    [Math.cos(angle), Math.sin(angle), 0],
    [-Math.sin(angle), Math.cos(angle), 0],
    [0, 0, 1],
  ];
  return cross(matrix, rotateMatrix);
}

function Scale(matrix, sx, sy) {
  const scaleMatrix = [
    [sx, 0, 0],
    [0, sy, 0],
    [0, 0, 1],
  ];
  return cross(matrix, scaleMatrix);
}

function translate(matrix, tx, ty) {
  const translateMatrix = [
    [1, 0, 0],
    [0, 1, 0],
    [tx, ty, 1],
  ];
  return cross(matrix, translateMatrix);
}

const K = 0.55228;
function generateEllipsePath(longAxis, shortAxis, center) {
  const lA = longAxis / 2,
    sA = shortAxis / 2;
  // 切线的dx dy
  const cpX = lA * K,
    cpY = sA * K;

  const part1 = [Point(-lA, 0), Point(-lA, cpY), Point(-cpX, sA), Point(0, sA)];
  const part2 = [Point(cpX, sA), Point(lA, cpY), Point(lA, 0)];
  const part3 = [Point(lA, -cpY), Point(cpX, -sA), Point(0, -sA)];
  const part4 = [Point(-cpX, -sA), Point(-lA, -cpY), Point(-lA, 0)];
  const points = part1.concat(part2, part3, part4);
  // 将原点为圆心的椭圆移动到center的位置，使其圆心为center
  const coords = translate(points, center[0], center[1]);
  const M = coords[0];
  const C = coords.slice(1);
  return {
    path: `M ${M[0]} ${M[1]} ${C.reduce((prev, cur, index) => {
      if (index % 3 === 0) {
        return prev + `C ${cur[0]} ${cur[1]} `;
      } else if (index % 3 === 1) {
        return prev + `${cur[0]} ${cur[1]} `;
      } else {
        return prev + `${cur[0]} ${cur[1]}`;
      }
    }, "")} Z`,
    points: coords,
  };
}

function generateCirclePath(radius, center) {
  return generateEllipsePath(radius, radius, center);
}

function generatePolygonPath(points) {
  const M = points[0];
  const L = points.slice(1);
  return {
    path: `M ${M[0]} ${M[1]} ${L.reduce((prev, cur, index) => {
      if (index % 2 === 0) {
        return prev + `L ${cur[0]} ${cur[1]} `;
      } else {
        return prev + `${cur[0]} ${cur[1]}`;
      }
    }, "")} Z`,
    points,
  };
}

function generateRectanglePath(width, height, center) {
  const w = width / 2,
    h = height / 2;
  const points = [Point(-w, h), Point(w, h), Point(w, -h), Point(-w, -h)];
  return generatePolygonPath(translate(points, center[0], center[1]));
}

const Nodes = new Map();
let count = 0;
function bbox(points) {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  points.forEach((coord) => {
    minX = Math.min(minX, coord[0]);
    maxX = Math.max(maxX, coord[0]);
    minY = Math.min(minY, coord[1]);
    maxY = Math.max(maxY, coord[1]);
  });
  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

function anchors(obj) {
  const { minX, maxX, minY, maxY } = obj;
  const p = [
    Point(minX, minY),
    Point(minX, maxY),
    Point(maxX, maxY),
    Point(maxX, minY),
  ];

  return {
    1: {
      point: Point.add(p[0], p[1]),
    },
    2: {
      point: Point.add(p[1], p[2]),
    },
    3: {
      point: Point.add(p[2], p[3]),
    },
    4: {
      point: Point.add(p[3], p[0]),
    },
    radius: 6,
    style: {
      fillStyle: "white",
    },
  };
}

function generateNodes(type, ...args) {
  let path;
  switch (type) {
    case "ellipse": {
      const [longAxis, shortAxis, center] = args;
      path = generateEllipsePath(longAxis, shortAxis, center);
      break;
    }
    case "circle": {
      const [radius, center] = args;
      path = generateCirclePath(radius, center);
      break;
    }
    case "rectangle": {
      const [width, height, center] = args;
      path = generateRectanglePath(width, height, center);
      break;
    }
    case "polygon": {
      const [points] = args;
      path = generatePolygonPath(points);
      break;
    }
    default:
      break;
  }
  const box = bbox(path.points);
  return {
    ...path,
    ...box,
    anchors: anchors(box),
  };
}

export function setProperty(target, key, value) {
  const t = target[key];
  if (typeof t === "string") {
    target[key] = value;
  } else if (t instanceof Object) {
    Object.keys(value).forEach((key) => {
      t[key] = value[key];
    });
    value.events &&
      Object.keys(value.events).forEach((key) => {
        value.events[key].bind(t);
      });
    target[key] = t;
  }
}

export function createNode(type, ...args) {
  const detail = generateNodes(type, ...args);
  Nodes.set(`node-${count++}`, detail);
  return detail;
}

export function getNodes() {
  return Nodes;
}

const normal = Vector(1, 0); // x轴正方向
// 为了使三角形有一个对的朝向，我们需要知道三角形的偏转角度
function normalize(v) {
  // 向量归一化
  const len = Math.hypot(v[0], v[1]);
  return Vector(v[0] / len, v[1] / len);
}

function angle(v1, v2) {
  const negative = v1[0] * v2[1] - v1[1] * v2[0]; // 右手定则，判断v2在v1的左边还是右边
  const r = Math.acos(dot(normalize(v1), normalize(v2)));
  return negative >= 0 ? r : -r;
}

function generateTriangle(theta, end) {
  const w = 10;
  const h = 8;
  const points = [Point(0, 0), Point(-w, h / 2), Point(-w, -h / 2)];
  const r = translate(Rotate(points, theta), end[0], end[1]);
  const [p1, p2, p3] = r;
  return `M${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} L ${p3[0]} ${p3[1]} Z`;
}

function generateStraightLinePath(start, end) {
  // 我们希望节点发生位移时，起点和终点能跟着变动，所以我们让start和end是包含节点ID和锚点ID的字符串，每次都通过ID去拿到最新的锚点坐标，例如node-1#1，代表节点ID为node-1，锚点ID为1
  const [startNode, startAnchor] = start.split("#");
  const [endNode, endAnchor] = end.split("#");
  const s = Nodes.get(startNode).anchors[startAnchor].point;
  const e = Nodes.get(endNode).anchors[endAnchor].point;
  const r = angle(normal, Vector(e[0] - s[0], e[1] - s[1]));
  const marker = generateTriangle(r, e);
  return {
    start,
    end,
    path: `M ${s[0]} ${s[1]} L ${e[0]} ${e[1]}`,
    marker,
  };
}

const Edges = new Map();
let edgeCount = 0;

export function createEdge(type, ...args) {
  let path;
  switch (type) {
    case "straight": {
      const [start, end] = args;
      path = generateStraightLinePath(start, end);
      break;
    }
    default:
      break;
  }
  Edges.set(`edge-${edgeCount++}`, path);
}

export function getEdges() {
  return Edges;
}

let context;

export function initialize(target) {
  const canvas = document.querySelector(target);
  context = canvas.getContext("2d");
}

export function draw() {
  context.save();
  Edges?.forEach((value) => {
    context.stroke(new Path2D(value.path));
    if (value.marker) {
      context.fill(new Path2D(value.marker));
    }
  });
  Nodes?.forEach((value) => {
    context.stroke(new Path2D(value.path));
    const { style, radius } = value.anchors;
    [1, 2, 3, 4].forEach((index) => {
      const { point } = value.anchors[index];
      style &&
        Object.keys(style).forEach((key) => {
          context[key] = style[key];
        });
      context.stroke(new Path2D(generateCirclePath(radius, point).path));
      if (style?.fillStyle) {
        context.lineWidth = 2;
        context.strokeStyle = "black";
        context.stroke(new Path2D(generateCirclePath(radius, point).path));
      }
      context.fill(new Path2D(generateCirclePath(radius, point).path));
    });
    context.restore();
  });
  console.log(Nodes);
}

function parseSvgPath(pathString) {
  // 分割 path 字符串，将各个指令和参数提取出来
  const commands = pathString.match(/[a-zA-Z][^a-zA-Z]*/g);

  // 定义一个结果数组，用来存储解析后的指令和坐标
  const result = [];

  // 定义一个变量，用来记录当前点的坐标
  let currentPoint = [0, 0];

  // 遍历每一个指令
  for (let i = 0; i < commands.length; i++) {
    // 提取指令类型
    const command = commands[i].charAt(0);

    // 提取参数列表
    const args = commands[i].substr(1).trim().split(/[ ,]+/).map(parseFloat);

    // 根据指令类型和参数列表计算出新的坐标
    let newPoint, controlPoint1, controlPoint2;
    switch (command) {
      case "M":
      case "L":
      case "T":
        newPoint = [args[0], args[1]];
        currentPoint = newPoint;
        break;
      case "m":
      case "l":
      case "t":
        newPoint = [currentPoint[0] + args[0], currentPoint[1] + args[1]];
        currentPoint = newPoint;
        break;
      case "H":
        newPoint = [args[0], currentPoint[1]];
        currentPoint = newPoint;
        break;
      case "h":
        newPoint = [currentPoint[0] + args[0], currentPoint[1]];
        currentPoint = newPoint;
        break;
      case "V":
        newPoint = [currentPoint[0], args[0]];
        currentPoint = newPoint;
        break;
      case "v":
        newPoint = [currentPoint[0], currentPoint[1] + args[0]];
        currentPoint = newPoint;
        break;
      case "C":
        controlPoint1 = [args[0], args[1]];
        controlPoint2 = [args[2], args[3]];
        newPoint = [args[4], args[5]];
        currentPoint = newPoint;
        break;
      case "c":
        controlPoint1 = [currentPoint[0] + args[0], currentPoint[1] + args[1]];
        controlPoint2 = [currentPoint[0] + args[2], currentPoint[1] + args[3]];
        newPoint = [currentPoint[0] + args[4], currentPoint[1] + args[5]];
        currentPoint = newPoint;
        break;
      case "S":
      case "Q":
        controlPoint2 = [args[0], args[1]];
        newPoint = [args[2], args[3]];
        currentPoint = newPoint;
        break;
      case "s":
      case "q":
        controlPoint2 = [currentPoint[0] + args[0], currentPoint[1] + args[1]];
        newPoint = [currentPoint[0] + args[2], currentPoint[1] + args[3]];
        currentPoint = newPoint;
        break;
      case "A":
        newPoint = [args[5], args[6]];
        currentPoint = newPoint;
        break;
      case "a":
        newPoint = [currentPoint[0] + args[5], currentPoint[1] + args[6]];
        currentPoint = newPoint;
        break;
      case "Z":
      case "z":
        newPoint = null;
        currentPoint = null;
        break;
    }
    controlPoint1 =
      controlPoint1 !== undefined
        ? Point(controlPoint1[0], controlPoint1[1])
        : undefined;
    controlPoint2 =
      controlPoint2 !== undefined
        ? Point(controlPoint2[0], controlPoint2[1])
        : undefined;
    newPoint =
      newPoint !== undefined ? Point(newPoint[0], newPoint[1]) : undefined;
    result.push({
      command,
      coordinates: [controlPoint1, controlPoint2, newPoint],
    });
  }

  return result;
}
