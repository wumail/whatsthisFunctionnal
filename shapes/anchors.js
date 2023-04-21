export default function anchors() {
  const style = {
    strokeStyle: "black",
    fillStyle: "white",
  };
  const a = {
    type: "circle", // path || coordinates || circle || rectangle ||
    style,
    events: {
      mouseover: function (e) {
        a.style.lineWidth = 10;
        a.style.strokeStyle = "#8585856b";
      },
      mouseleave: function (e) {
        a.style = style;
      },
    },
  };
  return a;
}

// const defaultOptions = {
//   style: {
//     strokeStyle: "black",
//     fillStyle: "white",
//   },
//   events: {
//     click: function () {},
//   },
// };
