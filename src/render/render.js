import Texture from './texture'
import { defaultFragmentShaderSource, vertexShaderSource } from './shaders';

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
    this.quadPositionBuffer = null;
    this.cubePositionBuffer = null;
    this.cubePositionIndecies = null;

    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const defaultFragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, defaultFragmentShaderSource);
    this.defaultShaderProgram = this.createProgram(gl, vertexShader, defaultFragmentShader);
  }

  createShader(gl, type, source) {
    const shader = gl.createShader(type);   // создание шейдера
    gl.shaderSource(shader, source);        // устанавливаем шейдеру его программный код
    gl.compileShader(shader);               // компилируем шейдер
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {                          // если компиляция прошла успешно - возвращаем шейдер
      // console.log('Compiled shader!', source);
      return shader;
    }

    console.log('Failed to compile', source);
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }

  createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      // console.log('Linked shaders!');
      return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }

  beginFrame() {
    this.renderTargetsStack = [];
    this.pushRenderTarget(this._frontBuffer);

    // очищаем canvas
    this.gl.clearColor(182 / 255, 16 / 255, 204 / 255, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  endFrame(transform) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.copyTexture(this._frontBuffer, transform, true);
  }

  copyTexture(source, transform, flipY = false) {
    const { gl } = this;

    if (!source) {
      console.log('empty image to copy');
      return;
    }

    if (!this.defaultShaderProgram) {
      console.log('defaultShaderProgram');
      return;
    }

    gl.useProgram(this.defaultShaderProgram);

    // Для фрагментного shader'a
    // bind texture samples
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform1i(gl.getUniformLocation(this.defaultShaderProgram, 'u_sampler'), 0);
    gl.uniform1i(gl.getUniformLocation(this.defaultShaderProgram, 'u_flipY'), flipY);
    gl.uniformMatrix3fv(gl.getUniformLocation(this.defaultShaderProgram, 'u_transform'), false, transform);

    this.drawFullScreenQuad(this.defaultShaderProgram);
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
    if (!this.quadPositionBuffer) {
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
      this.quadPositionBuffer = gl.createBuffer();
      // В переменной ARRAY_BUFFER находится this.state.quadPositionBuffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadPositionBuffer);
      // В ARRAY_BUFFER передаем quadVertices и флаг, что структура не будет меняться
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    return this.quadPositionBuffer;
  }

  getCubePositionBuffer() {
    const { gl } = this;
    if (!this.cubePositionBuffer) {
      // 6 - граней куба, для каждой грани 2 треугольника (6 вершин) => 6 x 6 = 36 трехмерных точек

      const cubeVertices =
        [ // X, Y, Z           R, G, B
          // Top
          -1.0, 1.0, -1.0,   0.5, 0.5, 0.5,
          -1.0, 1.0, 1.0,    0.5, 0.5, 0.5,
          1.0, 1.0, 1.0,     0.5, 0.5, 0.5,
          1.0, 1.0, -1.0,    0.5, 0.5, 0.5,

          // Left
          -1.0, 1.0, 1.0,    0.75, 0.25, 0.5,
          -1.0, -1.0, 1.0,   0.75, 0.25, 0.5,
          -1.0, -1.0, -1.0,  0.75, 0.25, 0.5,
          -1.0, 1.0, -1.0,   0.75, 0.25, 0.5,

          // Right
          1.0, 1.0, 1.0,    0.25, 0.25, 0.75,
          1.0, -1.0, 1.0,   0.25, 0.25, 0.75,
          1.0, -1.0, -1.0,  0.25, 0.25, 0.75,
          1.0, 1.0, -1.0,   0.25, 0.25, 0.75,

          // Front
          1.0, 1.0, 1.0,    1.0, 0.0, 0.15,
          1.0, -1.0, 1.0,    1.0, 0.0, 0.15,
          -1.0, -1.0, 1.0,    1.0, 0.0, 0.15,
          -1.0, 1.0, 1.0,    1.0, 0.0, 0.15,

          // Back
          1.0, 1.0, -1.0,    0.0, 1.0, 0.15,
          1.0, -1.0, -1.0,    0.0, 1.0, 0.15,
          -1.0, -1.0, -1.0,    0.0, 1.0, 0.15,
          -1.0, 1.0, -1.0,    0.0, 1.0, 0.15,

          // Bottom
          -1.0, -1.0, -1.0,   0.5, 0.5, 1.0,
          -1.0, -1.0, 1.0,    0.5, 0.5, 1.0,
          1.0, -1.0, 1.0,     0.5, 0.5, 1.0,
          1.0, -1.0, -1.0,    0.5, 0.5, 1.0,
        ];

      let boxIndices =
        [
          // Top
          0, 1, 2,
          0, 2, 3,

          // Left
          5, 4, 6,
          6, 4, 7,

          // Right
          8, 9, 10,
          8, 10, 11,

          // Front
          13, 12, 14,
          15, 14, 12,

          // Back
          16, 17, 18,
          16, 18, 19,

          // Bottom
          21, 20, 22,
          22, 20, 23
        ];

      // make initialization
      this.cubePositionBuffer = gl.createBuffer();
      // В переменной ARRAY_BUFFER находится this.state.cubePositionBuffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.cubePositionBuffer);
      // В ARRAY_BUFFER передаем cubeVertices и флаг, что структура не будет меняться
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      this.cubePositionIndecies = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubePositionIndecies);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(boxIndices), gl.STATIC_DRAW);

    }

    return this.cubePositionBuffer;
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

  drawCube(shaderProgram) {
    const { gl } = this;

    gl.useProgram(shaderProgram);

    gl.enable(gl.DEPTH_TEST);
    //gl.depthFunc(gl.LESS);
    //gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CW);
    gl.cullFace(gl.BACK);

    const positionBuffer = this.getCubePositionBuffer();
    const idxBuffer = this.cubePositionIndecies;
    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
    console.assert(positionAttributeLocation !== -1);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);

    // Для вершинного shader'a
    // Указываем атрибуту positionAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    let size = 3;           // 3 компоненты на итерацию (x, y, z)
    const type = gl.FLOAT;    // наши данные - 32-битные числа с плавающей точкой
    const normalize = false;  // не нормализовать данные (не приводить в диапазон от 0 до 1)
    const stride = 6 * 4;     // на каждую вершину храним 5 компонент, размер gl.FLOAT - 4 байта
    let offset = 0;           // начинать с начала буфера

    // Для атрибута позиции необходимо использовать следуюшие данные
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

    // Для атрибута текстурных координат необходимо использовать следуюшие данные
    const texCoordAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_texCoord');
    console.assert(texCoordAttributeLocation !== -1);
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    // Для атрибута текстурных координат texCoordAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    // пропускаем первые 3 элемента, размер gl.FLOAT - 4 байта
    offset = 3 * 4;
    size = 3;
    gl.vertexAttribPointer(texCoordAttributeLocation, size, type, normalize, stride, offset);

    //gl.uniform2fv(gl.getUniformLocation(shaderProgram, 'u_resolution'), [this.width, this.height]);

    // Для отправки на отрисовку
    const primitiveType = gl.TRIANGLES;
    const count = 6 * 6; // количество вершин
    //gl.drawArrays(primitiveType, 0, count);

    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);

    gl.disable(gl.DEPTH_TEST); // todo restore state
    gl.disable(gl.CULL_FACE);
  }
}