export default class Texture {
  constructor(gl, width, height, image, isRenderTarget) {
    this.width = width;
    this.height = height;
    this.image = image;
    this.isRenderTarget = isRenderTarget;
    this.isBoundAsRT = false;
    this.gl = gl;

    this._texture =  gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    // create texImage2
    if (isRenderTarget) {

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    } else {
      //gl.textImage2D(target, level, internalformat, width, height, border, format, type, ImageData source)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    // todo ???
    gl.generateMipmap(gl.TEXTURE_2D);

    if (isRenderTarget) {
      this.frameBuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
      const attachmentPoint = gl.COLOR_ATTACHMENT0;
      gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, this.texture, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  bindAsRenderTarget() {
    this.isBoundAsRT = true;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.renderTarget);
  }

  unbindAsRenderTarget() {
    this.isBoundAsRT = false;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  get renderTarget() {
    console.assert(this.isRenderTarget, 'Texture must be created with render target flag');
    return this.frameBuffer;
  }

  get texture() {
    return this._texture;
  }

  set texture(value) {
    this._texture = value;
  }
}