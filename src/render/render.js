import Texture from './texture'
import { defaultFragmentShaderSource, vertexShaderSource } from './shaders';
import Vec3 from './vec3'
import * as math from 'mathjs';

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
    this.tetrahedronPositionBuffer = null;
    this.tetrahedronPositionIndecies = null;
    this.planetPositionBuffer = null;
    this.planetPositionIndecies = null;
    this.planetIndices = [];

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
    this.gl.clearColor(4 / 255, 5 / 255, 45 / 255, 1);
    //this.gl.clearColor(245 / 255, 232 / 255, 249 / 255, 1);
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
          -1.0, 1.0, -1.0,   0.2, 0.7, 0.9,
          -1.0, 1.0, 1.0,    0.2, 0.7, 0.9,
          1.0, 1.0, 1.0,     0.2, 0.7, 0.9,
          1.0, 1.0, -1.0,    0.2, 0.7, 0.9,

          // Left
          -1.0, 1.0, 1.0,    0.75, 0.25, 0.4,
          -1.0, -1.0, 1.0,   0.75, 0.25, 0.4,
          -1.0, -1.0, -1.0,  0.75, 0.25, 0.4,
          -1.0, 1.0, -1.0,   0.75, 0.25, 0.4,

          // Right
          1.0, 1.0, 1.0,    0.25, 0.25, 0.8,
          1.0, -1.0, 1.0,   0.25, 0.25, 0.8,
          1.0, -1.0, -1.0,  0.25, 0.25, 0.8,
          1.0, 1.0, -1.0,   0.25, 0.25, 0.8,

          // Front
          1.0, 1.0, 1.0,    1.0, 0.0, 0.2,
          1.0, -1.0, 1.0,    1.0, 0.0, 0.2,
          -1.0, -1.0, 1.0,    1.0, 0.0, 0.2,
          -1.0, 1.0, 1.0,    1.0, 0.0, 0.2,

          // Back
          1.0, 1.0, -1.0,    0.0, 1.0, 0.2,
          1.0, -1.0, -1.0,    0.0, 1.0, 0.2,
          -1.0, -1.0, -1.0,    0.0, 1.0, 0.2,
          -1.0, 1.0, -1.0,    0.0, 1.0, 0.2,

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
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    return {
      vertices: this.cubePositionBuffer,
      indices: this.cubePositionIndecies
    }
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

    const { vertices: positionBuffer, indices: idxBuffer } = this.getCubePositionBuffer();

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

  getTetrahedronPositionBuffer() {
    const { gl } = this;
    if (!this.tetrahedronPositionBuffer) {
      // 6 - граней куба, для каждой грани 2 треугольника (6 вершин) => 6 x 6 = 36 трехмерных точек

      const tetrahedronVertices =
        [ // X, Y, Z           R, G, B
          // Front
          -1.0, -1.0,  1.0,   0.0, 1.0, 0.0,
          0.0,  0.75, 0.125, 0.0, 1.0, 0.0,
          1.0, -1.0,  1.0,   0.0, 1.0, 0.0,

          // Front Left
          1.0, -1.0,  1.0,    1.0, 0.0, 1.0,
          0.0,  0.75, 0.125,  1.0, 0.0, 1.0,
          0.0, -1.0, -0.75,   1.0, 0.0, 1.0,

          // Back
          0.0, -1.0, -0.75,   1.0, 0.0, 0.0,
          0.0,  0.75, 0.125,   1.0, 0.0, 0.0,
          -1.0, -1.0,  1.0,   1.0, 0.0, 0.0,

          // Bottom
          -1.0, -1.0, 1.0,   0.0, 1.0, 1.0,
          1.0, -1.0, 1.0,   0.0, 1.0, 1.0,
          0.0, -1.0, -0.75, 0.0, 1.0, 1.0,
        ];

      let boxIndices =
        [
          // Front
          0, 1, 2,
          // Front Left
          3, 4, 5,
          // Back
          6, 7, 8,
          // Bottom
          9,10, 11
        ];

      // make initialization
      this.tetrahedronPositionBuffer = gl.createBuffer();
      // В переменной ARRAY_BUFFER находится this.state.tetrahedronPositionBuffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tetrahedronPositionBuffer);
      // В ARRAY_BUFFER передаем tetrahedronVertices и флаг, что структура не будет меняться
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tetrahedronVertices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      this.tetrahedronPositionIndecies = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.tetrahedronPositionIndecies);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(boxIndices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    return {
      vertices: this.tetrahedronPositionBuffer,
      indices: this.tetrahedronPositionIndecies
    }
  }

  drawTetrahedron(shaderProgram) {
    const {gl} = this;

    gl.useProgram(shaderProgram);

    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CW);
    gl.cullFace(gl.BACK);

    const { vertices: positionBuffer, indices: idxBuffer } = this.getTetrahedronPositionBuffer();

    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
    console.assert(positionAttributeLocation !== -1);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);

    // Для вершинного shader'a
    // Указываем атрибуту positionAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    let size = 3;             // 3 компоненты на итерацию (x, y, z)
    const type = gl.FLOAT;    // наши данные - 32-битные числа с плавающей точкой
    const normalize = false;  // не нормализовать данные (не приводить в диапазон от 0 до 1)
    const stride = 6 * 4;     // на каждую вершину храним 6 компонент, размер gl.FLOAT - 4 байта
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

    // Для отправки на отрисовку
    const count = 3 * 4; // количество вершин

    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);

    gl.disable(gl.DEPTH_TEST); // todo restore state
    gl.disable(gl.CULL_FACE);
  }

  getGrid(width, height, steps, meshStartIdx, transform) {
    let vertices = [];
    const idxs = [];
    let numVertices = 0;

    const stepX = width / steps;
    const stepY = height / steps;

    const sphereRadius = width * Math.sqrt(2) / 2;

    for (let currentStepY = 0; currentStepY < steps; ++currentStepY) {
      for (let currentStepX = 0; currentStepX < steps; ++currentStepX) {
        const currX = stepX * currentStepX;
        const currY = stepY * currentStepY;

        const positionsXY = [
          currX,          currY,
          currX + stepX,  currY,
          currX,          currY + stepY,
          currX + stepX,  currY + stepY
        ];

        const color = [87/255, 51/255, 155/255];
        //const color = [Math.random(), Math.random(), Math.random()];

        // fill per vertex data
        for (let i = 0; i < positionsXY.length; i += 2) {
          const transformedPosition = math.multiply(math.matrix([positionsXY[i], positionsXY[i + 1], 0.0, 1.0]), transform).toArray();

          const normal = new Vec3(transformedPosition[0], transformedPosition[1], transformedPosition[2]).normalize();
          const positionOnSphere = normal.scale(sphereRadius);
          const texCoord = [positionsXY[i] / width, positionsXY[i + 1] / height];
          vertices.push.apply( // vertex position
            vertices,
            [positionOnSphere.x, positionOnSphere.y, positionOnSphere.z]
          );
          vertices.push.apply(vertices, color); // vertex color
          vertices.push.apply(vertices, texCoord);
          vertices.push.apply(vertices, [normal.x, normal.y, normal.z]); // vertex normal
          numVertices++;
        }

        const startIdx = meshStartIdx + 4 * (currentStepX + currentStepY * steps);
        idxs.push(startIdx, startIdx + 1, startIdx + 2, startIdx + 2, startIdx + 1, startIdx + 3);
      }
    }

    return {
      vertices,
      indices: idxs,
      maxIdx: meshStartIdx + numVertices
    }
  }

  getPlanetPositionBuffer() {
    const { gl } = this;

    if (!this.planetPositionBuffer) {
      const planetVertices = [];
      const boxIndices = [];

      const transforms = [ //angleY, angleX
        [0, 0],
        [90, 0],
        [180, 0],
        [270, 0],
        [0, 90],
        [0, -90]
      ];

      const width = 2;
      const height = 2;
      const translate = math.matrix([
        [1, 0, 0,  0],
        [0, 1, 0,  0],
        [0, 0, 1,  0],
        [-0.5*width, -0.5*height, 0.5 * width,  1]
      ]);

      let startIdx = 0;
      for (let i = 0; i < transforms.length; i++) {
        const angleY = transforms[i][0] * Math.PI / 180;
        c = math.cos(angleY);
        s = math.sin(angleY);
        const rotateAroundY = math.matrix([
          [ c,  0, -s, 0],
          [ 0,  1,  0, 0],
          [ s,  0,  c, 0],
          [ 0,  0,  0, 1]
        ]);

        const angle = transforms[i][1] * Math.PI / 180;
        let s = math.sin(angle);
        let c = math.cos(angle);
        const rotateAroundX = math.matrix([
          [1,  0,  0,  0],
          [0,  c,  s,  0],
          [0, -s,  c,  0],
          [0,  0,  0,  1]
        ]);

        const transform  = math.multiply(translate, rotateAroundY, rotateAroundX);

        const { vertices : faceVertices, indices: faceIndices, maxIdx: lastIdx } = this.getGrid(2, 2, 50, startIdx, transform);

        planetVertices.push.apply(planetVertices, faceVertices);
        boxIndices.push.apply(boxIndices, faceIndices);
        startIdx = lastIdx;
      }

      // make initialization
      this.planetPositionBuffer = gl.createBuffer();
      // В переменной ARRAY_BUFFER находится this.state.planetPositionBuffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.planetPositionBuffer);
      // В ARRAY_BUFFER передаем planetVertices и флаг, что структура не будет меняться
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(planetVertices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      this.planetPositionIndecies = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.planetPositionIndecies);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(boxIndices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      this.planetIndices = boxIndices;
    }

    return {
      vertices: this.planetPositionBuffer,
      indices: this.planetPositionIndecies,
      indicesCount: this.planetIndices.length
    }
  }

  drawPlanet(shaderProgram) {
    const { gl } = this;

    gl.useProgram(shaderProgram);

    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CW);
    gl.cullFace(gl.BACK);
    //gl.enable(gl.CULL_FACE);

    const { vertices: positionBuffer, indices: idxBuffer, indicesCount: count } = this.getPlanetPositionBuffer();

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
    const stride = 11 * 4;     // на каждую вершину храним 9 компонент, размер gl.FLOAT - 4 байта [position.xyz, color.xyz, texCoord.xy, normal.xyz]
    let offset = 0;           // начинать с начала буфера

    // Для атрибута позиции необходимо использовать следуюшие данные
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

    // Для атрибута текстурных координат необходимо использовать следуюшие данные
    const colorAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_color');
    console.assert(colorAttributeLocation !== -1);
    gl.enableVertexAttribArray(colorAttributeLocation);
    // Для атрибута текстурных координат colorAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    // пропускаем первые 3 элемента, размер gl.FLOAT - 4 байта
    offset = 3 * 4;
    size = 3;
    gl.vertexAttribPointer(colorAttributeLocation, size, type, normalize, stride, offset);

    // Для атрибута текстурных координат необходимо использовать следуюшие данные
    const texCoordAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_texCoord');
    console.assert(texCoordAttributeLocation !== -1);
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    // Для атрибута текстурных координат texCoordAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    // пропускаем первые 6 элементов, размер gl.FLOAT - 4 байта
    offset = 6 * 4;
    size = 2;
    gl.vertexAttribPointer(texCoordAttributeLocation, size, type, normalize, stride, offset);

    const normalAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_normal');
    console.assert(normalAttributeLocation !== -1);
    offset = 8 * 4; // position (3) + color(3) + texCoord(2) == 8
    size = 3; // normal.xyz
    gl.vertexAttribPointer(normalAttributeLocation, size, type, normalize, stride, offset);

    // count - количество вершин для отправки на отрисовку
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);

    gl.disable(gl.DEPTH_TEST); // todo restore state
    gl.disable(gl.CULL_FACE);
  }
}