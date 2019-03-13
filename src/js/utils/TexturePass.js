import {
  PlaneGeometry,
  Scene,
  WebGLRenderTarget,
  OrthographicCamera,
  Vector2,
  ShaderMaterial,
  Mesh,
  Texture
} from "three";

class TexturePass {
  constructor(renderer, fragmentShader, uniforms = {}) {
    this.renderer = renderer;
    this.scene = new Scene();

    const { width, height } = renderer.getDrawingBufferSize();

    this.camera = new OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      -1,
      1
    );

    this.scene.add(this.camera);

    this.renderTarget = new WebGLRenderTarget(width, height);
    this.material = new ShaderMaterial({
      uniforms: {
        u_inv_resolution: {
          value: new Vector2(1 / width, 1 / height)
        },
        u_texture: {
          value: new Texture()
        },
        ...uniforms
      },
      vertexShader: `void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
      fragmentShader
    });

    const geometry = new PlaneGeometry(width, height);
    const mesh = new Mesh(geometry, this.material);
    this.scene.add(mesh);
  }

  get uniforms() {
    return this.material.uniforms;
  }

  process(texture) {
    this.material.uniforms.u_texture.value = texture;
    this.renderer.render(this.scene, this.camera, this.renderTarget);
    return this.renderTarget.texture;
  }
}

export default TexturePass;
