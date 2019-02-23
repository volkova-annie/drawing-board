import React, { Component } from 'react';
import Render from './render/render'
import {
  vertexShaderSource,
  blurFragmentShaderSource,
  bwFragmentShaderSource,
  defaultFragmentShaderSource
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
    // this.fill = this.fill.bind(this);
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
      positionAttributeLocation: -1,
      texCoordAttributeLocation: -1,
      positionBuffer: null,
      renderBuffer1: null,
      renderBuffer2: null,
      renderTexture1: null,
      renderTexture2: null,
      blurSize: 0,
      isImageLoaded: false,
      isBlackAndWhite: false
    };
  }

  // TODO: delete shaders, on exit delete program

  componentDidMount() {
    const gl = this.canvas.current.getContext('webgl');

    if (!gl) {
      console.log("No webgl!");
      return;
    }

    this.setState({ gl: gl, render: new Render(gl) });

    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const blurFragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, blurFragmentShaderSource);
    const bwFragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, bwFragmentShaderSource);
    const defaultFragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, defaultFragmentShaderSource);

    // console.log(gl.canvas.width, gl.canvas.height);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.setState({
      blurShaderProgram: this.createProgram(gl, vertexShader, blurFragmentShader),
      bwShaderProgram: this.createProgram(gl, vertexShader, bwFragmentShader),
      defaultShaderProgram: this.createProgram(gl, vertexShader, defaultFragmentShader),
      positionBuffer: gl.createBuffer(),
      lennaImage: gl.createTexture()
    }, () => {
      const { frameBuffer: frameBuffer1, renderTexture: renderTexture1 } = this.createRenderTarget();
      const { frameBuffer: frameBuffer2, renderTexture: renderTexture2 } = this.createRenderTarget();

      this.createRenderBuffer(gl, frameBuffer1, renderTexture1, frameBuffer2, renderTexture2);

      // В переменной ARRAY_BUFFER находится this.state.positionBuffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.state.positionBuffer);
      // В ARRAY_BUFFER передаем quadVertices и флаг, что структура не будет меняться
      console.log();
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertices), gl.STATIC_DRAW);


      //fetch(reign_image)
      //  .then(function(response) {
      //    return response.blob()
      //  })
      //  .then((blob) => {
      //    const reader = new FileReader();
      //    reader.onloadend = () => {
      //      this.setState({ lennaImage: this.state.render.createTexture(reader.result).texture});
      //
      //      this.setState({ isImageLoaded: true });
      //    };
      //
      //    reader.readAsArrayBuffer(blob);
      //  });

      // load image
      const image = new Image();
      image.onload = () => {
        //console.log("asd");
        console.log(image);
        this.setState({ lennaImage: this.state.render.createTexture(image).texture });
      //  console.log(image);
      //
      //  gl.bindTexture(gl.TEXTURE_2D, this.state.lennaImage);
      //  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      //  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      //  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      //  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      //  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
      //  gl.generateMipmap(gl.TEXTURE_2D);
      //  gl.bindTexture(gl.TEXTURE_2D, null);

        this.setState({ isImageLoaded: true });
      };
      image.src = reign_image;
    });

    // console.log("a_position", this.positionAttributeLocation);
    // console.log("a_texCoord", this.texCoordAttributeLocation);

    // Вызов renderGL 100 кадров в секунду
    setInterval(this.renderGL, 100);
  }

  createRenderBuffer(gl, frameBuffer1, renderTexture1, frameBuffer2, renderTexture2) {
    this.setState({
      positionAttributeLocation: gl.getAttribLocation(this.state.blurShaderProgram, "a_position"),
      texCoordAttributeLocation: gl.getAttribLocation(this.state.blurShaderProgram, "a_texCoord"),
      // Создание промежуточного буффера отображения (картинка, в которую рисуем)
      renderBuffer1: frameBuffer1,
      renderTexture1: renderTexture1,
      renderBuffer2: frameBuffer2,
      renderTexture2: renderTexture2
    });
  }

  renderGL() {
    const {
      gl, lennaImage, blurSize, isBlackAndWhite, renderBuffer1,
      renderBuffer2, renderTexture1, renderTexture2
    } = this.state;

    // очищаем canvas
    gl.clearColor(0, 1, 1, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //this.blurImage(lennaImage, blurSize);
    //this.copyToRenderTarget(lennaImage, null);

    //this.copyToRenderTarget(lennaImage);
    this.copyToRenderTarget(lennaImage, renderBuffer1);
    if (isBlackAndWhite) {
      this.bwImage(lennaImage, renderBuffer1);
    }
    this.blurImage(renderTexture1, blurSize, renderBuffer2, renderTexture2, renderBuffer1);
    this.copyToRenderTarget(renderTexture1, null);
  }

  copyToRenderTarget(image, renderTarget = null, flipY = false) {
    const {
      gl, defaultShaderProgram, positionAttributeLocation, positionBuffer, texCoordAttributeLocation, isImageLoaded
    } = this.state;

    if (!isImageLoaded) {
      return;
    }

    if (!defaultShaderProgram) {
      console.log('defaultShaderProgram');
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

    if (renderTarget) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget);
    }

    gl.useProgram(defaultShaderProgram);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    console.log("CopyTexture");

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
    gl.uniform1i(gl.getUniformLocation(defaultShaderProgram, "u_sampler"), 0);
    gl.uniform1i(gl.getUniformLocation(defaultShaderProgram, "u_flipY"), flipY);

    // Для отправки на отрисовку
    const primitiveType = gl.TRIANGLE_STRIP;
    offset = 0;
    const count = 4; // количество вершин
    gl.drawArrays(primitiveType, offset, count);

    if (renderTarget) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  bwImage(image, renderTarget){
    const {
      gl, bwShaderProgram, positionAttributeLocation, positionBuffer, texCoordAttributeLocation, isImageLoaded
    } = this.state;

    if (!isImageLoaded) {
      return;
    }

    if (!bwShaderProgram) {
      console.log('bwShaderProgram');
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

    if (renderTarget) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget);
    }

    gl.useProgram(bwShaderProgram);

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
    gl.uniform1i(gl.getUniformLocation(bwShaderProgram, "u_sampler"), 0);
    gl.uniform1i(gl.getUniformLocation(bwShaderProgram, "u_flipY"), 0);

    // Для отправки на отрисовку
    const primitiveType = gl.TRIANGLE_STRIP;
    offset = 0;
    const count = 4; // количество вершин
    gl.drawArrays(primitiveType, offset, count);

    if (renderTarget) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  blurImage(image, blurSize, tempRenderTarget, tempRenderTexture, renderTarget) {
    const {
      gl, blurShaderProgram, positionAttributeLocation, positionBuffer, texCoordAttributeLocation,
      canvasHeight, canvasWidth, isImageLoaded
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

    gl.bindFramebuffer(gl.FRAMEBUFFER, tempRenderTarget);

    // Для отправки на отрисовку
    const primitiveType = gl.TRIANGLE_STRIP;
    offset = 0;
    const count = 4; // количество вершин
    gl.drawArrays(primitiveType, offset, count);

    if (renderTarget) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.bindTexture(gl.TEXTURE_2D, tempRenderTexture);

    gl.uniform2fv(gl.getUniformLocation(blurShaderProgram, "u_dir"), [0.0, 1.0 / canvasHeight]);
    gl.uniform1i(gl.getUniformLocation(blurShaderProgram, "u_flipY"), 1);

    gl.drawArrays(primitiveType, offset, count);

    if (renderTarget) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  createRenderTarget() {
    const { gl, canvasWidth, canvasHeight, render } = this.state;
    const target = render.createRenderTarget(canvasWidth, canvasHeight);
    return { renderTexture: target.texture, frameBuffer: target.renderTarget };

    //const renderTexture = gl.createTexture();
    //gl.bindTexture(gl.TEXTURE_2D, renderTexture);
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasWidth, canvasHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //
    ////const frameBuffer = gl.createFramebuffer();
    ////gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    ////const attachmentPoint = gl.COLOR_ATTACHMENT0;
    ////gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, renderTexture, 0);
    ////gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    //
    //gl.bindTexture(gl.TEXTURE_2D, null);
    //
    //// this.setState({ renderBuffer1, frameBuffer});
    //return { renderTexture, frameBuffer };
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

  makeBlackWhite() {
    this.setState({ isBlackAndWhite: true });
  }

  resetBlackAndWhite() {
    this.setState({ isBlackAndWhite: false });
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