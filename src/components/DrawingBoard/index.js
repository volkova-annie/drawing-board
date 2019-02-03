import React, { Component } from 'react';
import styles from './styles.css';

import reign_image from '../../images/rhein.jpg'

const veterxShaderSource = `
  // атрибут, который будет получать данные из буфера
  attribute vec4 a_position;
  attribute vec2 a_texCoord;
  
  varying highp vec2 v_texCoord;
  
  uniform bool u_flipY;
  
  // все шейдеры имеют функцию main
  void main() {

  // gl_Position - специальная переменная вершинного шейдера,
  // которая отвечает за установку положения
  gl_Position = a_position;
  v_texCoord = vec2(a_texCoord.x, u_flipY ? 1.0 - a_texCoord.y : a_texCoord.y);
}`;

const blurFragmentShaderSource = `
  // фрагментные шейдеры не имеют точности по умолчанию, поэтому нам необходимо её
  // указать. mediump подойдёт для большинства случаев. Он означает "средняя точность"

  precision mediump float;
 
  varying highp vec2 v_texCoord;

  uniform sampler2D u_sampler;
  uniform float     u_sigma;  // Gaussian sigma
  uniform vec2      u_dir;    // horiz=(1.0, 0.0), vert=(0.0, 1.0)

  #define PI 3.141593
  #define MAX_STEPS 30

  void main() {
    vec2 loc = v_texCoord; // center pixel cooordinate
    vec4 acc; // accumulator
    acc = texture2D(u_sampler, loc); // accumulate center pixel
    if (u_sigma > 0.0) {
      for (int i = 1; i <= MAX_STEPS; i++) {
        float coeff = exp(-0.5 * float(i) * float(i) / (u_sigma * u_sigma));
        acc += (texture2D(u_sampler, loc - float(i) * u_dir)) * coeff; // L
        acc += (texture2D(u_sampler, loc + float(i) * u_dir)) * coeff; // R
      }
      acc *= 1.0 / (sqrt(2.0 * PI) * u_sigma); // normalize for unity gain
    }

    gl_FragColor = acc;
  }`;

const bwFragmentShaderSource = `
  precision mediump float;
 
  varying highp vec2 v_texCoord;

  uniform sampler2D u_sampler;
  uniform float     u_sigma;  // Gaussian sigma
  uniform vec2      u_dir;    // horiz=(1.0, 0.0), vert=(0.0, 1.0)

  #define PI 3.141593
  #define MAX_STEPS 30

  void main() {
    vec2 loc = v_texCoord; // center pixel cooordinate
    vec4 acc; // accumulator
    acc = texture2D(u_sampler, loc); // accumulate center pixel
    if (u_sigma > 0.0) {
      for (int i = 1; i <= MAX_STEPS; i++) {
        float coeff = exp(-0.5 * float(i) * float(i) / (u_sigma * u_sigma));
        acc += (texture2D(u_sampler, loc - float(i) * u_dir)) * coeff; // L
        acc += (texture2D(u_sampler, loc + float(i) * u_dir)) * coeff; // R
      }
      acc *= 1.0 / (sqrt(2.0 * PI) * u_sigma); // normalize for unity gain
    }

    gl_FragColor = acc;
  }`;

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
    // this.fill = this.fill.bind(this);
    this.renderGL = this.renderGL.bind(this);
    this.createRenderTarget = this.createRenderTarget.bind(this);

    this.canvas = React.createRef();

    this.state = {
      canvasWidth: 1024,
      canvasHeight: 512,
      gl: null,
      blurShaderProgram: null,
      positionAttributeLocation: -1,
      texCoordAttributeLocation: -1,
      positionBuffer: null,
      sceneTexture: null,
      frameBuffer: null,
      blurSize: 0,
      isImageLoaded: false
    };
  }

  // TODO: delete shaders, on exit delete program

  componentDidMount() {
    const gl = this.canvas.current.getContext('webgl');

    if (!gl) {
      console.log("No webgl!");
      return;
    }

    this.setState({ gl: gl });

    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, veterxShaderSource);
    const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, blurFragmentShaderSource);

    // console.log(gl.canvas.width, gl.canvas.height);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.setState({
      blurShaderProgram: this.createProgram(gl, vertexShader, fragmentShader),
      positionBuffer: gl.createBuffer(),
      lennaImage: gl.createTexture()
    }, () => {
      this.setState({
        positionAttributeLocation: gl.getAttribLocation(this.state.blurShaderProgram, "a_position"),
        texCoordAttributeLocation: gl.getAttribLocation(this.state.blurShaderProgram, "a_texCoord")
      });
      // В переменной ARRAY_BUFFER находится this.state.positionBuffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.state.positionBuffer);
      // В ARRAY_BUFFER передаем quadVertices и флаг, что структура не будет меняться
      console.log();
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertices), gl.STATIC_DRAW);
      // load image
      const image = new Image();
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, this.state.lennaImage);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);

        this.setState({ isImageLoaded: true });
      };
      image.src = reign_image;
      // Создание промежуточного буффера отображения
      this.createRenderTarget();
    });

    // console.log("a_position", this.positionAttributeLocation);
    // console.log("a_texCoord", this.texCoordAttributeLocation);

    // Вызов renderGL 100 кадров в секунду
    setInterval(this.renderGL, 100);
  }

  renderGL() {
    //console.log('asd');
    const { gl, lennaImage, blurSize } = this.state;

    // очищаем canvas
    gl.clearColor(0, 1, 1, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.blurImage(lennaImage, blurSize);
  }

  blurImage(image, blurSize) {
    const {
      gl, blurShaderProgram, positionAttributeLocation, positionBuffer, texCoordAttributeLocation,
      canvasHeight, canvasWidth, frameBuffer, sceneTexture, isImageLoaded
    } = this.state;

    if (!isImageLoaded) {
      return;
    }

    if (!blurShaderProgram) {
      console.log('blurShaderProgram');
      return;
    }
    if (positionAttributeLocation === -1) {
      console.log('positionAttributeLocation');
      return;
    }
    if (texCoordAttributeLocation === -1) {
      console.log('texCoordAttributeLocation');
      return;
    }

    gl.useProgram(blurShaderProgram);

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
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    // Для атрибута текстурных координат texCoordAttributeLocation, как получать данные от positionBuffer (ARRAY_BUFFER)
    // пропускаем первые 2 элемента, размер gl.FLOAT - 4 байта
    offset = 2 * 4;
    gl.vertexAttribPointer(texCoordAttributeLocation, size, type, normalize, stride, offset);

    // Для фрагментного shader'a
    // bind texture samples
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, image);
    gl.uniform1i(gl.getUniformLocation(blurShaderProgram, "u_sampler"), 0);
    gl.uniform1f(gl.getUniformLocation(blurShaderProgram, "u_sigma"), blurSize);
    gl.uniform2fv(gl.getUniformLocation(blurShaderProgram, "u_dir"), [1.0 / canvasWidth, 0.0]);
    gl.uniform1i(gl.getUniformLocation(blurShaderProgram, "u_flipY"), 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    // Для отправки на отрисовку
    const primitiveType = gl.TRIANGLE_STRIP;
    offset = 0;
    const count = 4; // количество вершин
    gl.drawArrays(primitiveType, offset, count);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);

    gl.uniform2fv(gl.getUniformLocation(blurShaderProgram, "u_dir"), [0.0, 1.0 / canvasHeight]);
    gl.uniform1i(gl.getUniformLocation(blurShaderProgram, "u_flipY"), 1);

    gl.drawArrays(primitiveType, offset, count);
  }

  createRenderTarget() {
    const { gl, canvasWidth, canvasHeight } = this.state;
    const sceneTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasWidth, canvasHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, sceneTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.bindTexture(gl.TEXTURE_2D, null);

    this.setState({ sceneTexture, frameBuffer});
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