import {
  CircleGeometry,
  Texture,
  MeshBasicMaterial,
  Mesh,
  Multiply
} from "three";

const gradientCircle = (r, restDensity, color) => {
  const textureQuality = 4;
  const s = 2 ** textureQuality / 2;
  const circleGeometry = new CircleGeometry(r * 0.75, 8);
  const canvas = document.createElement("canvas");
  canvas.width = s * 2;
  canvas.height = s * 2;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(s, s, 0, s, s, s);
  gradient.addColorStop(
    0.05,
    `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 1)`
  );
  gradient.addColorStop(
    0.2,
    `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, ${1 /
      restDensity})`
  );
  gradient.addColorStop(
    0.9,
    `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0)`
  );

  ctx.arc(s, s, s, 0, 2 * Math.PI);

  ctx.fillStyle = gradient;
  ctx.fill();

  const gradientTexture = new Texture(canvas);
  gradientTexture.needsUpdate = true;

  const material = new MeshBasicMaterial({
    map: gradientTexture
  });

  material.transparent = true;

  // material.blending = Multiply;

  const gradientMesh = new Mesh(circleGeometry, material);

  return gradientMesh;
};

export default gradientCircle;
