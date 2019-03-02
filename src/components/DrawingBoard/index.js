import React, { Component } from 'react';
import Render from './render/render'
import {
  vertexShaderSource,
  blurFragmentShaderSource,
  bwFragmentShaderSource,
  defaultFragmentShaderSource,
  waterAnimationFragmentShaderSource
} from './render/shaders';
import reign_image from '../../images/rhein.jpg'


// три двумерных точки
const quadVertices = [
  // pos   // uv
  -1, -1,  0,  1,
  -1,  1,  0,  0,
  1, -1,  1,  1,
  1,  1,  1,  0
];

class DrawingPage extends Component {
  constructor(props) {
    super(props);
    this.renderGL = this.renderGL.bind(this);
    this.createRenderTarget = this.createRenderTarget.bind(this);

    this.canvas = React.createRef();

    this.state = {
      canvasWidth: 1024,
      canvasHeight: 512,
      gl: null,
      render: null,
      blurShaderProgram: null,
      lennaImage: null,
      bwShaderProgram: null,
      defaultShaderProgram: null,
      waterAnimationShaderProgram: null,
      positionBuffer: null,

      blurSize: 0,
      isImageLoaded: false,
      isBlackAndWhite: false,
      isAnimated: false
    };
  }

  // TODO: delete shaders, on exit delete program

  componentDidMount() {
    const gl = this.canvas.current.getContext('webgl');

    if (!gl) {
      console.log('No webgl!');
      return;
    }

    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const blurFragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, blurFragmentShaderSource);
    const bwFragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, bwFragmentShaderSource);
    const defaultFragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, defaultFragmentShaderSource);
    const waterAnimationFragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, waterAnimationFragmentShaderSource);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const render = new Render(gl, this.state.canvasWidth, this.state.canvasHeight);
    const blurShaderProgram = this.createProgram(gl, vertexShader, blurFragmentShader);
    const bwShaderProgram = this.createProgram(gl, vertexShader, bwFragmentShader);
    const defaultShaderProgram = this.createProgram(gl, vertexShader, defaultFragmentShader);
    const waterAnimationShaderProgram = this.createProgram(gl, vertexShader, waterAnimationFragmentShader);
    const positionBuffer = gl.createBuffer();

    this.setState({
      gl,
      render,
      blurShaderProgram,
      bwShaderProgram,
      defaultShaderProgram,
      waterAnimationShaderProgram,
      positionBuffer
    }, () => {
      // В переменной ARRAY_BUFFER находится this.state.positionBuffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.state.positionBuffer);
      // В ARRAY_BUFFER передаем quadVertices и флаг, что структура не будет меняться
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertices), gl.STATIC_DRAW);

      // load image
      const image = new Image();
      image.onload = () => {
        this.setState({ lennaImage: this.state.render.createTexture(image) });

        this.setState({ isImageLoaded: true });
      };
      image.src = reign_image;
    });

    // Вызов renderGL 100 кадров в секунду
    setInterval(this.renderGL, 100);
  }

  renderGL() {
    const {
      lennaImage, blurSize, isBlackAndWhite, render, isAnimated
    } = this.state;

    if (!this.state.isImageLoaded) {
      return;
    }

    render.beginFrame();

    if (isAnimated) {
      this.animateImage(lennaImage);
    } else {
      this.copyTexture(lennaImage);
    }

    if (isBlackAndWhite) {
      render.pushRenderTarget(render.availableRTs.fullResA);
      this.bwImage(render.frontBuffer);
      render.popRenderTarget();

      this.copyTexture(render.availableRTs.fullResA);
    }

    this.blurImage(render.frontBuffer, blurSize, render.availableRTs.fullResA);

    render.endFrame((source, flip) => { this.copyTexture(source, flip); } ); // todo: move to Render
  }

  copyTexture(source, flipY = false) {
    const {
      gl, defaultShaderProgram, positionBuffer
    } = this.state;

    if (!source) {
      console.log('empty image to copy');
      return;
    }

    if (!defaultShaderProgram) {
      console.log('defaultShaderProgram');
      return;
    }

    gl.useProgram(defaultShaderProgram);

    const positionAttributeLocation = gl.getAttribLocation(defaultShaderProgram, 'a_position');
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

    const texCoordAttributeLocation = gl.getAttribLocation(defaultShaderProgram, 'a_texCoord');
    console.assert(texCoordAttributeLocation !== -1);

    // Для атрибута позиции необходимо использовать следуюшие данные
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
    // Для атрибута текстурных координат необходимо использовать следуюшие данные
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    // Для атрибута текстурных координат texCoordAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    // пропускаем первые 2 элемента, размер gl.FLOAT - 4 байта
    offset = 2 * 4;
    gl.vertexAttribPointer(texCoordAttributeLocation, size, type, normalize, stride, offset);

    // Для фрагментного shader'a
    // bind texture samples
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform1i(gl.getUniformLocation(defaultShaderProgram, 'u_sampler'), 0);
    gl.uniform1i(gl.getUniformLocation(defaultShaderProgram, 'u_flipY'), flipY);

    // Для отправки на отрисовку
    const primitiveType = gl.TRIANGLE_STRIP;
    offset = 0;
    const count = 4; // количество вершин
    gl.drawArrays(primitiveType, offset, count);
  }

  bwImage(source){
    const {
      gl, bwShaderProgram, positionBuffer
    } = this.state;

    if (!source) {
      console.log('empty image to filter');
      return;
    }

    if (!bwShaderProgram) {
      console.log('bwShaderProgram');
      return;
    }

    gl.useProgram(bwShaderProgram);


    const positionAttributeLocation = gl.getAttribLocation(bwShaderProgram, 'a_position');
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

    const texCoordAttributeLocation = gl.getAttribLocation(bwShaderProgram, 'a_texCoord');
    console.assert(texCoordAttributeLocation !== -1);

    // Для атрибута позиции необходимо использовать следуюшие данные
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
    // Для атрибута текстурных координат необходимо использовать следуюшие данные
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    // Для атрибута текстурных координат texCoordAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    // пропускаем первые 2 элемента, размер gl.FLOAT - 4 байта
    offset = 2 * 4;
    gl.vertexAttribPointer(texCoordAttributeLocation, size, type, normalize, stride, offset);

    // Для фрагментного shader'a
    // bind texture samples
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform1i(gl.getUniformLocation(bwShaderProgram, 'u_sampler'), 0);
    gl.uniform1i(gl.getUniformLocation(bwShaderProgram, 'u_flipY'), 0);

    // Для отправки на отрисовку
    const primitiveType = gl.TRIANGLE_STRIP;
    offset = 0;
    const count = 4; // количество вершин
    gl.drawArrays(primitiveType, offset, count);
  }

  blurImage(sourceDest, blurSize, tempTexture) {
    const {
      gl, blurShaderProgram, positionBuffer, canvasHeight, canvasWidth, render
    } = this.state;

    if (!blurShaderProgram) {
      console.log('blurShaderProgram');
      return;
    }

    gl.useProgram(blurShaderProgram);

    const positionAttributeLocation = gl.getAttribLocation(blurShaderProgram, 'a_position');
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

    const texCoordAttributeLocation = gl.getAttribLocation(blurShaderProgram, 'a_texCoord');
    console.assert(texCoordAttributeLocation !== -1);

    // Для атрибута позиции необходимо использовать следуюшие данные
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
    // Для атрибута текстурных координат необходимо использовать следуюшие данные
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    // Для атрибута текстурных координат texCoordAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    // пропускаем первые 2 элемента, размер gl.FLOAT - 4 байта
    offset = 2 * 4;
    gl.vertexAttribPointer(texCoordAttributeLocation, size, type, normalize, stride, offset);

    // Для фрагментного shader'a
    // bind texture samplers
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceDest.texture);
    gl.uniform1i(gl.getUniformLocation(blurShaderProgram, 'u_sampler'), 0);
    gl.uniform1f(gl.getUniformLocation(blurShaderProgram, 'u_sigma'), blurSize);
    gl.uniform2fv(gl.getUniformLocation(blurShaderProgram, 'u_dir'), [1.0 / canvasWidth, 0.0]);
    gl.uniform1i(gl.getUniformLocation(blurShaderProgram, 'u_flipY'), 0);

    // рисуем в промежуточную текстуру
    render.pushRenderTarget(tempTexture);
    // Для отправки на отрисовку
    const primitiveType = gl.TRIANGLE_STRIP;
    offset = 0;
    const count = 4; // количество вершин
    gl.drawArrays(primitiveType, offset, count);

    render.popRenderTarget();

    // рисуем в исходную текстуру
    render.pushRenderTarget(sourceDest);

    gl.bindTexture(gl.TEXTURE_2D, tempTexture.texture);
    gl.uniform2fv(gl.getUniformLocation(blurShaderProgram, 'u_dir'), [0.0, 1.0 / canvasHeight]);
    gl.uniform1i(gl.getUniformLocation(blurShaderProgram, 'u_flipY'), 0);

    gl.drawArrays(primitiveType, offset, count);

    render.popRenderTarget();
  }

  animateImage(source) {
    const {
      gl, waterAnimationShaderProgram, positionBuffer
    } = this.state;

    if (!source) {
      console.log('empty image to animate');
      return;
    }

    if (!waterAnimationShaderProgram) {
      console.log('waterAnimationShaderProgram');
      return;
    }

    const FRACTION = 10000;
    const currentTime = (new Date().getTime() % FRACTION) / FRACTION;

    gl.useProgram(waterAnimationShaderProgram);

    const positionAttributeLocation = gl.getAttribLocation(waterAnimationShaderProgram, 'a_position');
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

    const texCoordAttributeLocation = gl.getAttribLocation(waterAnimationShaderProgram, 'a_texCoord');
    console.assert(texCoordAttributeLocation !== -1);

    // Для атрибута позиции необходимо использовать следуюшие данные
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
    // Для атрибута текстурных координат необходимо использовать следуюшие данные
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    // Для атрибута текстурных координат texCoordAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    // пропускаем первые 2 элемента, размер gl.FLOAT - 4 байта
    offset = 2 * 4;
    gl.vertexAttribPointer(texCoordAttributeLocation, size, type, normalize, stride, offset);

    // Для фрагментного shader'a
    // bind texture samples
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform1i(gl.getUniformLocation(waterAnimationShaderProgram, 'u_sampler'), 0);
    gl.uniform1i(gl.getUniformLocation(waterAnimationShaderProgram, 'u_flipY'), false);
    gl.uniform1f(gl.getUniformLocation(waterAnimationShaderProgram, 'u_currentTime'), currentTime);

    // Для отправки на отрисовку
    const primitiveType = gl.TRIANGLE_STRIP;
    offset = 0;
    const count = 4; // количество вершин
    gl.drawArrays(primitiveType, offset, count);
  }

  createRenderTarget() {
    const { canvasWidth, canvasHeight, render } = this.state;
    return render.createRenderTarget(canvasWidth, canvasHeight);;
  }

  createShader(gl, type, source) {
    const shader = gl.createShader(type);   // создание шейдера
    gl.shaderSource(shader, source);        // устанавливаем шейдеру его программный код
    gl.compileShader(shader);               // компилируем шейдер
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {                          // если компиляция прошла успешно - возвращаем шейдер
      console.log('Compiled shader!', source);
      return shader;
    }
    
    console.log('Fail to compile', source);
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
      console.log('Linked shaders!');
      return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }

  makeBlackWhite() {
    this.setState({ isBlackAndWhite: true });
  }

  resetBlackAndWhite() {
    this.setState({ isBlackAndWhite: false });
  }

  addAnimation() {
    this.setState({ isAnimated: true });
    //console.log('isAnimated', this.state.isAnimated);
  }

  resetAnimation() {
    this.setState({ isAnimated: false });
  }

  setBlurRadius(value) {
    const blurSize = Math.min(value, 10);

    this.setState({ blurSize });
  }

  render() {
    const { canvasWidth, canvasHeight } = this.state;
    return (
      <div>
        <canvas
          ref={ this.canvas }
          width={ canvasWidth }
          height={ canvasHeight }/>
      </div>
    )
  }
}

export default DrawingPage;