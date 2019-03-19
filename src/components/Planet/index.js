import { Component } from 'react';
import React from 'react';
import Render from '../../render/render'
import {
  vertexPlanetShaderSource,
  planetFragmentShaderSource
} from '../../render/shaders';
import * as math from 'mathjs';
import styles from './styles.css';

class Planet extends Component {
  constructor(props) {
    super(props);

    this.renderGL = this.renderGL.bind(this);
    this.handleTranslateX = this.handleTranslateX.bind(this);
    this.handleTranslateY = this.handleTranslateY.bind(this);
    this.handleTranslateZ = this.handleTranslateZ.bind(this);
    this.handleRotateX = this.handleRotateX.bind(this);
    this.handleRotateY = this.handleRotateY.bind(this);
    this.handleRotateZ = this.handleRotateZ.bind(this);
    this.handleScale = this.handleScale.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    this.planet = React.createRef();

    this.state = {
      render: null,
      canvasWidth: 1024,
      canvasHeight: 512,
      gl: null,
      planetShaderProgram: null,
      isTetrahedronShow: false,
      isCubeShow: false,
      translateX: 0,
      translateY: 0,
      translateZ: -0.5,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 0.1,
      touchStartPosition: null,
      mousePressed: false
    }
  }

  componentDidMount() {
    const gl = this.planet.current.getContext('webgl');

    if (!gl) {
      console.log('No webgl!');
      return;
    }

    const render = new Render(gl, this.state.canvasWidth, this.state.canvasHeight);

    const vertexShader = render.createShader(gl, gl.VERTEX_SHADER, vertexPlanetShaderSource);
    const planetFragmentShader = render.createShader(gl, gl.FRAGMENT_SHADER, planetFragmentShaderSource);

    const planetShaderProgram = render.createProgram(gl, vertexShader, planetFragmentShader);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.setState({
      gl,
      render,
      planetShaderProgram,
    });

    // Вызов renderGL 100 кадров в секунду
    setInterval(this.renderGL, 100);
  }

  renderGL() {
    const { gl, render, planetShaderProgram, isCubeShow, isTetrahedronShow,
      translateX, translateY, translateZ, rotateX, rotateY, rotateZ, scale
    } = this.state;

    render.beginFrame();

    const FRACTION = 10000;
    const currentTime = (new Date().getTime() % FRACTION) / FRACTION;

    gl.useProgram(planetShaderProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(planetShaderProgram, 'u_projection'), false, this.getPerspectiveMatrix());

    if (isCubeShow) {
      const modelTransform = this.getTransform({ translateX, translateY, translateZ, rotateX, rotateY, rotateZ, scale });
      gl.uniformMatrix4fv(gl.getUniformLocation(planetShaderProgram, 'u_transform'), false, modelTransform);
      render.drawCube(planetShaderProgram);
    }

    if (isTetrahedronShow) {
      const modelTetraTransform = this.getTransform({ translateX, translateY, translateZ, rotateX, rotateY, rotateZ, scale });
      gl.uniformMatrix4fv(gl.getUniformLocation(planetShaderProgram, 'u_transform'), false, modelTetraTransform);
      render.drawTetrahedron(planetShaderProgram);
    }

    const modelPlanetTransform = this.getTransform({ translateX, translateY, translateZ, rotateX, rotateY, rotateZ, scale });
    gl.uniformMatrix4fv(gl.getUniformLocation(planetShaderProgram, 'u_transform'), false, modelPlanetTransform);
    render.drawPlanet(planetShaderProgram);

    const transform = this.getTransform3x3();
    render.endFrame(transform); // todo: move to Render
  }

  getPerspectiveMatrix() {
    const { canvasWidth, canvasHeight } = this.state;

    const f = 100;
    const n = 0.1;
    const aspect = canvasWidth / canvasHeight;
    const angleOfView = 90;
    const scale = math.tan(angleOfView * 0.5 * Math.PI / 180);
    const r = aspect * scale;
    const l = -r;
    const t = scale;
    const b = -t;

    const a0 = scale / aspect; // 2 * n / (r - l);
    const a1 = scale; //2 * n / (t - b);
    const x = (r + l) / (r - l);
    const y = (t + b) / (t - b);
    const c = (f + n) / (n - f);
    const d = 2 * f * n / (n - f);
    const perspective = math.matrix([
      [a0, 0, 0, 0],
      [0, a1, 0, 0],
      [0,  0, c, -1],
      [0,  0, d, 0]
    ]);

    const result = math.flatten(perspective).toArray();
    return result;
  }

  getTransform(transformParams) {
    const params = {
      scale: 1,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      ...transformParams
    };

    const {
      scale, rotateX, rotateY, rotateZ, translateX, translateY, translateZ,
    } = params;
    let matrix = math.identity(4);
    
    const scaleMat = math.matrix([
      [scale, 0,     0,     0],
      [0,     scale, 0,     0],
      [0,     0,     scale, 0],
      [0,     0,     0,     1]
    ]);

    const translateMat = math.matrix([
      [1,           0,          0,          0],
      [0,           1,          0,          0],
      [0,           0,          1,          0],
      [translateX,  translateY, translateZ, 1]
    ]);

    const rotateXRad = rotateX * Math.PI / 180;
    let c = math.cos(rotateXRad);
    let s = math.sin(rotateXRad);
    const rotateAroundXMat = math.matrix([
      [ 1,  0,  0, 0],
      [ 0,  c,  s, 0],
      [ 0, -s,  c, 0],
      [ 0,  0,  0, 1]
    ]);

    const rotateYRad = rotateY * Math.PI / 180;
    c = math.cos(rotateYRad);
    s = math.sin(rotateYRad);
    const rotateAroundYMat = math.matrix([
      [ c,  0, -s, 0],
      [ 0,  1,  0, 0],
      [ s,  0,  c, 0],
      [ 0,  0,  0, 1]
    ]);

    const rotateZRad = rotateZ * Math.PI / 180;
    s = math.sin(rotateZRad);
    c = math.cos(rotateZRad);
    const rotateAroundZMat = math.matrix([
      [ c, s, 0, 0],
      [-s, c, 0, 0],
      [ 0, 0, 1, 0],
      [ 0, 0, 0, 1]
    ]);

    matrix = math.multiply(matrix, rotateAroundXMat, rotateAroundYMat, rotateAroundZMat, scaleMat, translateMat);

    return math.flatten(matrix).toArray();
  }

  getTransform3x3(scale = 1, rotateAngleDegree = 0) {
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
    return math.flatten(matrix).toArray();
  }

  handleTranslateX(event) {
    const { value } = event.target;
    this.setState({ translateX: value });
  }

  handleTranslateY(event) {
    const { value } = event.target;
    this.setState({ translateY: value });
  }

  handleTranslateZ(event) {
    const { value } = event.target;
    this.setState({ translateZ: value });
  }

  handleRotateX(event) {
    const { value } = event.target;
    this.setState({ rotateX: value });
  }

  handleRotateY(event) {
    const { value } = event.target;
    this.setState({ rotateY: value });
  }

  handleRotateZ(event) {
    const { value } = event.target;
    this.setState({ rotateZ: value });
  }

  handleScale(event) {
    const { value } = event.target;
    this.setState({ scale: value });
  }

  handleMouseDown(event) {
    const { clientX, clientY } = event;
    this.setState({ mousePressed: true });
  }

  handleMouseMove(event) {
    const { movementX, movementY } = event;
    if ( this.state.mousePressed ){
      this.setState((state) => {
        return {
          rotateX: state.rotateX - movementY,
          rotateY: state.rotateY + movementX
        }
      });
    }
    //this.setState({ touchStartPosition: { clientX, clientY }, mousePressed: true });
  }

  handleMouseUp(event) {
    this.setState({ mousePressed: false });
  }

    render() {
    const {
      canvasWidth, canvasHeight, translateX, translateY, translateZ, rotateX, rotateY, rotateZ, scale
    } = this.state;

    return (
      <section className={ styles.wrapper }>
        <header className={ styles.header }>
          <div className={ styles['column-header'] }>
            <h3>Translate</h3>
            <label htmlFor='translateX'>
              <span className={styles.rangeCaption}>translateX:</span>
              <input
                id='translateX'
                type='range'
                min='-3'
                max='3'
                step='0.2'
                value={ translateX }
                onChange={ this.handleTranslateX }
              />
              { translateX }
            </label>

            <label htmlFor='translateY'>
              <span className={styles.rangeCaption}>translateY:</span>
              <input
                id='translateY'
                type='range'
                min='-3'
                max='3'
                step='0.2'
                value={ translateY }
                onChange={ this.handleTranslateY }
              />
              { translateY }
            </label>

            <label htmlFor='translateZ'>
              <span className={styles.rangeCaption}>translateZ:</span>
              <input
                id='translateZ'
                type='range'
                min='-10'
                max='0'
                step='0.2'
                value={ translateZ }
                onChange={ this.handleTranslateZ }
              />
              { translateZ }
            </label>
          </div>

          <div className={ styles['column-header'] }>
            <h3>Angle</h3>
            <label htmlFor='rotateX'>
              <span className={styles.rangeCaption}>rotateX:</span>
              <input
                id='rotateX'
                type='range'
                min='0'
                max='360'
                step='1'
                value={ rotateX }
                onChange={ this.handleRotateX }
              />
              { rotateX }
            </label>

            <label htmlFor='rotateY'>
              <span className={styles.rangeCaption}>rotateY:</span>
              <input
                id='rotateY'
                type='range'
                min='0'
                max='360'
                step='1'
                value={ rotateY }
                onChange={ this.handleRotateY }
              />
              { rotateY }
            </label>

            <label htmlFor='rotateZ'>
              <span className={styles.rangeCaption}>rotateZ:</span>
              <input
                id='rotateZ'
                type='range'
                min='0'
                max='360'
                step='1'
                value={ rotateZ }
                onChange={ this.handleRotateZ }
              />
              { rotateZ }
            </label>
          </div>
          <div className={ styles['column-header'] }>
            <h3>Scale</h3>
            <label htmlFor='scale'>
              <span className={styles.rangeCaption}>scale:</span>
              <input
                id='scale'
                type='range'
                min='0.1'
                max='2'
                step='0.2'
                value={ scale }
                onChange={ this.handleScale }
              />
              { scale }
            </label>
          </div>
        </header>
        <div>
          <canvas
            ref={ this.planet }
            width={ canvasWidth }
            height={ canvasHeight }
            onMouseDown={ this.handleMouseDown }
            onMouseMove={ this.handleMouseMove }
            onMouseUp={ this.handleMouseUp }
          />
        </div>
      </section>
    )
  }
}

export default Planet;