import Texture from './texture'

export default class Render {
  constructor(gl) {
    this.gl = gl;
    this.renderTargets = [];
  }

  updateRenderTarget() {
    const idx = this.renderTargets.length - 1;
    const currentRT = idx >= 0 ? this.renderTargets[idx] : null;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, currentRT);
  }

  pushRenderTarget(texture) {
    this.renderTargets.push(texture.renderTarget);
    this.updateRenderTarget();
  }

  popRenderTarget() {
    this.renderTargets.pop();
    this.updateRenderTarget();
  }

  createRenderTarget(width, height) {
    return new Texture(this.gl, width, height, null, true);
  }

  createTexture(image) {
    return new Texture(this.gl, image.clientWidth, image.clientHeight, image, false);
  }
}