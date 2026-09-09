import { useLayoutEffect, useState } from "react";
import { PIT_RADIO_GEOMETRY } from "../../data/pit-radio-geometry.js";
import { observeElementResize } from "../../lib/browser-compat.js";

function solveLinearSystem(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-9) return null;
    for (let index = column; index <= size; index += 1) augmented[column][index] /= divisor;

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let index = column; index <= size; index += 1) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function getFourCornerMatrix(width, height, corners) {
  const source = [[0, 0], [width, 0], [width, height], [0, height]];
  const matrix = [];
  const vector = [];

  source.forEach(([x, y], index) => {
    const [targetX, targetY] = corners[index];
    matrix.push([x, y, 1, 0, 0, 0, -targetX * x, -targetX * y]);
    vector.push(targetX);
    matrix.push([0, 0, 0, x, y, 1, -targetY * x, -targetY * y]);
    vector.push(targetY);
  });

  const values = solveLinearSystem(matrix, vector);
  if (!values) return "none";
  const [a, b, c, d, e, f, g, h] = values;
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,1)`;
}

export function useProjectedPlayer(turntableRef) {
  const [style, setStyle] = useState({ opacity: 0 });

  useLayoutEffect(() => {
    const turntable = turntableRef.current;
    if (!turntable) return undefined;

    const update = () => {
      // Project in the turntable's own 1535×1024 coordinate plane.
      // getBoundingClientRect() includes the outer tilt/scale and would apply
      // that perspective twice, which is what caused the screen to drift.
      const width = turntable.clientWidth;
      const height = turntable.clientHeight;
      // Keep the last valid projection while the stage is temporarily unmeasurable.
      if (!width || !height) return;
      const scaleX = width / PIT_RADIO_GEOMETRY.canvas.width;
      const scaleY = height / PIT_RADIO_GEOMETRY.canvas.height;
      const player = PIT_RADIO_GEOMETRY.player;
      const flatWidth = player.flatWidth * scaleX;
      const flatHeight = player.flatHeight * scaleY;
      const corners = player.corners.map(([x, y]) => [
        x * scaleX + player.offsetX,
        y * scaleY + player.offsetY,
      ]);
      corners[1][0] += player.expandRight;
      corners[2][0] += player.expandRight;
      corners[2][1] += player.expandBottom;
      corners[3][1] += player.expandBottom;

      setStyle({
        width: `${flatWidth}px`,
        height: `${flatHeight}px`,
        opacity: 1,
        transform: getFourCornerMatrix(flatWidth, flatHeight, corners),
      });
    };

    update();
    const observer = observeElementResize(turntable, update);
    if (!observer) window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", update);
    };
  }, [turntableRef]);

  return style;
}
