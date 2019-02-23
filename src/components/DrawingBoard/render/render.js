import Texture from './texture'

export default class Render {
  constructor(gl) {
    this.gl = gl;
    this.renderTargets = [];
  }

  pushRenderTarget(renderTarget) {
    this.renderTargets.push(renderTarget);
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget);
  }

  popRenderTarget() {
    this.renderTargets.pop();
    if (this.renderTargets.length > 0) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderTargets[this.renderTargets.length - 1]);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  createRenderTarget(width, height) {
    return new Texture(this.gl, width, height, null, true);
  }

  createTexture(image) {
    return new Texture(this.gl, image.clientWidth, image.clientHeight, image, false);
  }


}