import { CircleGeometry, CanvasTexture, MeshBasicMaterial, Mesh } from "three";

const rgba = (r, g, b, a) => `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`

const particleMesh = (r, restDensity, color) => {
  const textureQuality = 5;
  const s = 2 ** textureQuality / 2;
  const circleGeometry = new CircleGeometry(r, 8);
  const canvas = document.createElement("canvas");
  canvas.width = s * 2;
  canvas.height = s * 2;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(s, s, 0, s, s, s);
  gradient.addColorStop(0.1, rgba(color.r, color.g, color.b, 0.1));
  gradient.addColorStop(
    0.5,
    rgba(color.r, color.g, color.b, 0.1 / restDensity)
  );
  gradient.addColorStop(0.8, rgba(color.r, color.g, color.b, 0));

  ctx.arc(s, s, s, 0, 2 * Math.PI);

  ctx.fillStyle = gradient;
  ctx.fill();

  const material = new MeshBasicMaterial({
    map: new CanvasTexture(canvas),
    transparent: true
  });

  return new Mesh(circleGeometry, material);
};

export default particleMesh;
