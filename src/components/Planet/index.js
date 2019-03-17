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

    this.planet = React.createRef();

    this.state = {
      render: null,
      canvasWidth: 1024,
      canvasHeight: 512,
      gl: null,
      planetShaderProgram: null
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
    const { gl, render, planetShaderProgram } = this.state;

    render.beginFrame();

    const FRACTION = 10000;
    const currentTime = (new Date().getTime() % FRACTION) / FRACTION;

    const modelTransform = this.getTransform(0.1, currentTime * 360, currentTime * 360, -0.3);

    gl.useProgram(planetShaderProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(planetShaderProgram, 'u_projection'), false, this.getPerspectiveMatrix());
    gl.uniformMatrix4fv(gl.getUniformLocation(planetShaderProgram, 'u_transform'), false, modelTransform);

    render.drawCube(planetShaderProgram);

    const modelTetraTransform = this.getTransform(0.1, 45, currentTime * 360, 0.1);
    gl.uniformMatrix4fv(gl.getUniformLocation(planetShaderProgram, 'u_transform'), false, modelTetraTransform);
    render.drawTetrahedron(planetShaderProgram);

    const modelPlanetTransform = this.getTransform(0.1, currentTime * 360, currentTime * 360, 0.5);
    gl.uniformMatrix4fv(gl.getUniformLocation(planetShaderProgram, 'u_transform'), false, modelPlanetTransform);
    render.drawPlanet(planetShaderProgram)

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

  getTransform(scale = 1, rotateZ = 0, rotateY = 0, translateX = 0) {
    let matrix = math.identity(4);
    const scaleXY = math.matrix([
      [scale, 0,     0,  0],
      [0,     scale, 0,  0],
      [0,     0,     scale,  0],
      [0,     0,     0,  1]
    ]);

    const translate = math.matrix([
      [1, 0, 0,  0],
      [0, 1, 0,  0],
      [0, 0, 1,  0],
      [translateX, 0.0, -0.8,  1]
    ]);

    const angle = rotateZ * Math.PI / 180;
    let s = math.sin(angle);
    let c = math.cos(angle);
    const rotateAroundZ = math.matrix([
      [c, s, 0, 0],
      [-s,  c, 0, 0],
      [0,  0, 1, 0],
      [0,  0, 0, 1]
    ]);

    const angleY = rotateY * Math.PI / 180;
    c = math.cos(angleY);
    s = math.sin(angleY);
    const rotateAroundY = math.matrix([
      [ c,  0, -s, 0],
      [ 0,  1,  0, 0],
      [ s,  0,  c, 0],
      [ 0,  0,  0, 1]
    ]);

    matrix = math.multiply(matrix, rotateAroundZ, rotateAroundY, scaleXY, translate);

    const result = math.flatten(matrix).toArray();
    return result;
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

    render() {
    const { canvasWidth, canvasHeight } = this.state;

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
                min='0.1'
                max='2'
                step='0.1'
                value={ this.state.translateX }
                onChange={ this.handleTranslateX }
              />
              { (this.state.translateX * 100).toFixed() }
            </label>

            <label htmlFor='translateY'>
              <span className={styles.rangeCaption}>translateY:</span>
              <input
                id='translateY'
                type='range'
                min='0.1'
                max='2'
                step='0.1'
                value={ this.state.translateY }
                onChange={ this.handleTranslateY }
              />
              { (this.state.translateY * 100).toFixed() }
            </label>

            <label htmlFor='translateZ'>
              <span className={styles.rangeCaption}>translateZ:</span>
              <input
                id='translateZ'
                type='range'
                min='0.1'
                max='2'
                step='0.1'
                value={ this.state.translateZ }
                onChange={ this.handleTranslateZ }
              />
              { (this.state.translateZ * 100).toFixed() }
            </label>
          </div>

          <div className={ styles['column-header'] }>
            <h3>Angle</h3>
            <label htmlFor='angleX'>
              <span className={styles.rangeCaption}>angleX:</span>
              <input
                id='angleX'
                type='range'
                min='0.1'
                max='2'
                step='0.1'
                value={ this.state.angleX }
                onChange={ this.handleAngleX }
              />
              { (this.state.angleX * 100).toFixed() }
            </label>

            <label htmlFor='angleY'>
              <span className={styles.rangeCaption}>angleY:</span>
              <input
                id='angleY'
                type='range'
                min='0.1'
                max='2'
                step='0.1'
                value={ this.state.angleY }
                onChange={ this.handleAngleY }
              />
              { (this.state.angleY * 100).toFixed() }
            </label>

            <label htmlFor='angleZ'>
              <span className={styles.rangeCaption}>angleZ:</span>
              <input
                id='angleZ'
                type='range'
                min='0.1'
                max='2'
                step='0.1'
                value={ this.state.angleZ }
                onChange={ this.handleAngleZ }
              />
              { (this.state.angleZ * 100).toFixed() }
            </label>
          </div>
        </header>
        <div>
          <canvas
            ref={ this.planet }
            width={ canvasWidth }
            height={ canvasHeight }/>
        </div>
      </section>
    )
  }
}

export default Planet;