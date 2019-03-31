import React, { Component } from 'react';
import * as math from 'mathjs';
import Render from '../../render/render'
import {
  vertexShaderSource,
  blurFragmentShaderSource,
  bwFragmentShaderSource,
  defaultFragmentShaderSource,
  waterAnimationFragmentShaderSource
} from '../../render/shaders';
import reign_image from '../../images/rhein.jpg';

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

      blurSize: 0,
      isImageLoaded: false,
      isBlackAndWhite: false,
      isAnimated: false,
      rotateAngleDegree: 0,
      scale: 1
    };
  }

  // TODO: delete shaders, on exit delete program

  componentDidMount() {
    const gl = this.canvas.current.getContext('webgl');

    if (!gl) {
      console.log('No webgl!');
      return;
    }

    const render = new Render(gl, this.state.canvasWidth, this.state.canvasHeight);

    const vertexShader = render.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const blurFragmentShader = render.createShader(gl, gl.FRAGMENT_SHADER, blurFragmentShaderSource);
    const bwFragmentShader = render.createShader(gl, gl.FRAGMENT_SHADER, bwFragmentShaderSource);
    const defaultFragmentShader = render.createShader(gl, gl.FRAGMENT_SHADER, defaultFragmentShaderSource);
    const waterAnimationFragmentShader = render.createShader(gl, gl.FRAGMENT_SHADER, waterAnimationFragmentShaderSource);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const blurShaderProgram = render.createProgram(gl, vertexShader, blurFragmentShader);
    const bwShaderProgram = render.createProgram(gl, vertexShader, bwFragmentShader);
    const defaultShaderProgram = render.createProgram(gl, vertexShader, defaultFragmentShader);
    const waterAnimationShaderProgram = render.createProgram(gl, vertexShader, waterAnimationFragmentShader);

    this.setState({
      gl,
      render,
      blurShaderProgram,
      bwShaderProgram,
      defaultShaderProgram,
      waterAnimationShaderProgram
    }, () => {
      // load image
      const image = new Image();
      image.onload = () => {
        this.setState({ lennaImage: this.state.render.createTexture(image), isImageLoaded: true });
      };
      image.src = reign_image;
    });

    // Вызов renderGL 100 кадров в секунду
    setInterval(this.renderGL, 100);
  }

  renderGL() {
    const {
      lennaImage, blurSize, isBlackAndWhite, render, isAnimated, rotateAngleDegree, scale
    } = this.state;

    if (!this.state.isImageLoaded) {
      return;
    }

    render.beginFrame();

    if (isAnimated) {
      this.animateImage(lennaImage);
    } else {
      render.copyTexture(lennaImage, this.getTransform());
    }

    if (isBlackAndWhite) {
      render.pushRenderTarget(render.availableRTs.fullResA);
      this.bwImage(render.frontBuffer);
      render.popRenderTarget();

      render.copyTexture(render.availableRTs.fullResA, this.getTransform());
    }

    this.blurImage(render.frontBuffer, blurSize, render.availableRTs.fullResA);

    const transform = this.getTransform(scale, rotateAngleDegree);
    render.endFrame(transform); // todo: move to Render transform!!
  }
  
  getTransform(scale = 1, rotateAngleDegree = 0) {
    let matrix = math.identity(3);
    const scaleXY = math.matrix([
      [scale, 0,     0],
      [0,     scale, 0],
      [0,     0,     1]
    ]);

    const angle = rotateAngleDegree * Math.PI / 180;
    const s = math.sin(angle);
    const c = math.cos(angle);
    const rotateAroundZ = math.matrix([
      [c, -s, 0],
      [s,  c, 0],
      [0,  0, 1]
    ]);
    matrix = math.multiply(matrix, rotateAroundZ, scaleXY);
    const result = math.flatten(matrix).toArray();
    return result;
  }

  bwImage(source){
    const { gl, bwShaderProgram, render } = this.state;

    if (!source) {
      console.log('empty image to filter');
      return;
    }

    if (!bwShaderProgram) {
      console.log('bwShaderProgram');
      return;
    }

    gl.useProgram(bwShaderProgram);

    // Для фрагментного shader'a
    // bind texture samples
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform1i(gl.getUniformLocation(bwShaderProgram, 'u_sampler'), 0);
    gl.uniform1i(gl.getUniformLocation(bwShaderProgram, 'u_flipY'), 0);
    gl.uniformMatrix3fv(gl.getUniformLocation(bwShaderProgram, 'u_transform'), false, this.getTransform());

    render.drawFullScreenQuad(bwShaderProgram);
  }

  blurImage(sourceDest, blurSize, tempTexture) {
    const {
      gl, blurShaderProgram, canvasHeight, canvasWidth, render
    } = this.state;

    if (!blurShaderProgram) {
      console.log('blurShaderProgram');
      return;
    }

    gl.useProgram(blurShaderProgram);

    // Для фрагментного shader'a
    // bind texture samplers
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceDest.texture);
    gl.uniform1i(gl.getUniformLocation(blurShaderProgram, 'u_sampler'), 0);
    gl.uniform1f(gl.getUniformLocation(blurShaderProgram, 'u_sigma'), blurSize);
    gl.uniform2fv(gl.getUniformLocation(blurShaderProgram, 'u_dir'), [1.0 / canvasWidth, 0.0]);
    gl.uniform1i(gl.getUniformLocation(blurShaderProgram, 'u_flipY'), 0);
    gl.uniformMatrix3fv(gl.getUniformLocation(blurShaderProgram, 'u_transform'), false, this.getTransform());

    // рисуем в промежуточную текстуру
    render.pushRenderTarget(tempTexture);

    render.drawFullScreenQuad(blurShaderProgram);

    render.popRenderTarget();

    // рисуем в исходную текстуру
    render.pushRenderTarget(sourceDest);

    gl.bindTexture(gl.TEXTURE_2D, tempTexture.texture);
    gl.uniform2fv(gl.getUniformLocation(blurShaderProgram, 'u_dir'), [0.0, 1.0 / canvasHeight]);
    gl.uniform1i(gl.getUniformLocation(blurShaderProgram, 'u_flipY'), 0);
    gl.uniformMatrix3fv(gl.getUniformLocation(blurShaderProgram, 'u_transform'), false, this.getTransform());

    render.drawFullScreenQuad(blurShaderProgram);

    render.popRenderTarget();
  }

  animateImage(source) {
    const { gl, waterAnimationShaderProgram, render } = this.state;

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

    // Для фрагментного shader'a
    // bind texture samples
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform1i(gl.getUniformLocation(waterAnimationShaderProgram, 'u_sampler'), 0);
    gl.uniform1i(gl.getUniformLocation(waterAnimationShaderProgram, 'u_flipY'), false);
    gl.uniform1f(gl.getUniformLocation(waterAnimationShaderProgram, 'u_currentTime'), currentTime);
    gl.uniformMatrix3fv(gl.getUniformLocation(waterAnimationShaderProgram, 'u_transform'), false, this.getTransform());

    render.drawFullScreenQuad(waterAnimationShaderProgram);
  }

  createRenderTarget() {
    const { canvasWidth, canvasHeight, render } = this.state;
    return render.createRenderTarget(canvasWidth, canvasHeight);;
  }

  makeBlackWhite() {
    this.setState({ isBlackAndWhite: true });
  }

  resetBlackAndWhite() {
    this.setState({ isBlackAndWhite: false });
  }

  addAnimation() {
    this.setState({ isAnimated: true });
  }

  resetAnimation() {
    this.setState({ isAnimated: false });
  }

  setRotationAngle(rotateAngleDegree) {
    this.setState({ rotateAngleDegree });
  }


  setScale(scale) {
    this.setState({ scale })
  }

  setBlurRadius(blurSize) {
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