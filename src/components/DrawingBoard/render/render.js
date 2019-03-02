import Texture from './texture'

export default class Render {
  constructor(gl, width, height) {
    console.assert(width > 1 && height > 1);
    this.gl = gl;
    this.renderTargetsStack = [];
    this.width = width;
    this.height = height;
    this._frontBuffer = this.createRenderTarget(this.width, this.height);
    this.availableRTs = {};
    this.createRTs();
  }

  beginFrame() {
    this.renderTargetsStack = [];
    this.pushRenderTarget(this._frontBuffer);

    // очищаем canvas
    this.gl.clearColor(0, 1, 1, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  endFrame(copyFunc) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    copyFunc(this._frontBuffer, true);
  }

  get frontBuffer() {
    return this._frontBuffer;
  }

  createRTs() {
    this.availableRTs = {
      fullResA: this.createRenderTarget(this.width, this.height),
      fullResB: this.createRenderTarget(this.width, this.height)
    }
  }

  updateRenderTarget() {
    const idx = this.renderTargetsStack.length - 1;
    const currentRT = idx >= 0 ? this.renderTargetsStack[idx] : null;
    currentRT.bindAsRenderTarget();
  }

  pushRenderTarget(texture) {
    //console.assert(this.renderTargetsStack.length == 0 || this.renderTargetsStack[this.renderTargetsStack.length - 1] != texture);
    this.renderTargetsStack.push(texture);
    this.updateRenderTarget();
  }

  popRenderTarget() {
    const last = this.renderTargetsStack.pop();
    last.unbindAsRenderTarget();
    this.updateRenderTarget();
  }

  createRenderTarget(width, height) {
    return new Texture(this.gl, width, height, null, true);
  }

  createTexture(image) {
    return new Texture(this.gl, image.clientWidth, image.clientHeight, image, false);
  }
}