import React, { Component } from 'react';
import styles from './styles.css';

import reign_image from '../../images/rhein.jpg'

const veterxShaderSource = `
// атрибут, который будет получать данные из буфера
attribute vec4 a_position;
attribute vec2 a_texCoord;

varying highp vec2 v_texCoord;

// все шейдеры имеют функцию main
void main() {

  // gl_Position - специальная переменная вершинного шейдера,
  // которая отвечает за установку положения
  gl_Position = a_position;
  v_texCoord = a_texCoord;
}`;

const fragmentShaderSource = `
// фрагментные шейдеры не имеют точности по умолчанию, поэтому нам необходимо её
  // указать. mediump подойдёт для большинства случаев. Он означает "средняя точность"
  precision mediump float;
 
  varying highp vec2 v_texCoord;

  uniform sampler2D u_sampler;
  uniform float u_blurSize;

  void main() {
    vec2 step = vec2(0.5 / 512.0) * u_blurSize;
    // gl_FragColor - специальная переменная фрагментного шейдера.
    // Она отвечает за установку цвета.
    //gl_FragColor = vec4(1, 0, 0.5, 1); // вернёт красновато-фиолетовый
    vec4 color = vec4(0.0);
    color += texture2D(u_sampler, v_texCoord + step * vec2(-1, -1));
    color += texture2D(u_sampler, v_texCoord + step * vec2(-1,  1));
    color += texture2D(u_sampler, v_texCoord + step * vec2( 1,  1));
    color += texture2D(u_sampler, v_texCoord + step * vec2( 1, -1));
    gl_FragColor = color * 0.25;
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
    this.onClick = this.onClick.bind(this);
    this.renderGL = this.renderGL.bind(this);

    this.canvas = React.createRef();

    this.state = {
      canvasWidth: 1024,
      canvasHeight: 512,
      gl: null,
      blurShaderProgram: null,
      positionAttributeLocation: -1,
      texCoordAttributeLocation: -1,
      positionBuffer: null,
    };
  }

  // TODO: delete shaders, on exit delete program

  componentDidMount() {
    const gl = this.canvas.current.getContext('webgl');

    if (!gl) {
      console.log("No webgl!");
      return;
    }

    this.setState({ gl: gl, blurSize: '0.0' });

    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, veterxShaderSource);
    const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

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
      //image.crossOrigin = "anonymous";
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, this.state.lennaImage);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
         gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
      };
      image.src = reign_image;
      //image.src = 'https://www.cosy.sbg.ac.at/~pmeerw/Watermarking/lena_color.gif';
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
      gl, blurShaderProgram, positionAttributeLocation, positionBuffer, texCoordAttributeLocation
    } = this.state;

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
    gl.uniform1f(gl.getUniformLocation(blurShaderProgram, "u_blurSize"), blurSize);

    // Для отправки на отрисовку
    const primitiveType = gl.TRIANGLE_STRIP;
    offset = 0;
    const count = 4; // количество вершин
    gl.drawArrays(primitiveType, offset, count);
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

  onClick() {
    const blurSize = (this.state.blurSize + 1) % 10;

    this.setState({ blurSize });
  }

  render() {
    const { canvasWidth, canvasHeight } = this.state;
    return (
      <div>
        <canvas
          ref={ this.canvas }
          width={ canvasWidth }
          height={ canvasHeight }
          onClick={ this.onClick } />
      </div>
    )
  }
}

export default DrawingPage;