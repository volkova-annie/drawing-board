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
    this.positionBuffer = null;
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

  getQuadPositionBuffer() {
    const { gl } = this;
    if (!this.positionBuffer) {
      // три двумерных точки
      const w = this.width / 2;
      const h = this.height / 2;
      const quadVertices = [
        // pos   // uv
        -w, -h,  0,  1,
        -w,  h,  0,  0,
         w, -h,  1,  1,
         w,  h,  1,  0
      ];
      // make initialization
      this.positionBuffer = gl.createBuffer();
      // В переменной ARRAY_BUFFER находится this.state.positionBuffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      // В ARRAY_BUFFER передаем quadVertices и флаг, что структура не будет меняться
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    return this.positionBuffer;
  }

  drawFullScreenQuad(shaderProgram) {
    const { gl } = this;
    const positionBuffer = this.getQuadPositionBuffer();
    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
    console.assert(positionAttributeLocation !== -1);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Для вершинного shader'a
    // Указываем атрибуту positionAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    const size = 2;           // 2 компоненты на итерацию (x, y)
    const type = gl.FLOAT;    // наши данные - 32-битные числа с плавающей точкой
    const normalize = false;  // не нормализовать данные (не приводить в диапазон от 0 до 1)
    const stride = 4 * 4;     // на каждую вершину храним 4 компоненты, размер gl.FLOAT - 4 байта
    let offset = 0;           // начинать с начала буфера

    // Для атрибута позиции необходимо использовать следуюшие данные
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

    // Для атрибута текстурных координат необходимо использовать следуюшие данные
    const texCoordAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_texCoord');
    console.assert(texCoordAttributeLocation !== -1);
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    // Для атрибута текстурных координат texCoordAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    // пропускаем первые 2 элемента, размер gl.FLOAT - 4 байта
    offset = 2 * 4;
    gl.vertexAttribPointer(texCoordAttributeLocation, size, type, normalize, stride, offset);

    gl.uniform2fv(gl.getUniformLocation(shaderProgram, 'u_resolution'), [this.width, this.height]);

    // Для отправки на отрисовку
    const primitiveType = gl.TRIANGLE_STRIP;
    offset = 0;
    const count = 4; // количество вершин
    gl.drawArrays(primitiveType, offset, count);
  }
}