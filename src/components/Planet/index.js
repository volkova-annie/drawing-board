import { Component } from 'react';
import React from 'react';
import ColorPicker from '../ColorPicker';
import Render from '../../render/render'
import {
  vertexPlanetShaderSource,
  planetFragmentShaderSource
} from '../../render/shaders';
import * as math from 'mathjs';
import styles from './styles.css';
//import reign_image from '../../images/rhein.jpg';

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
    this.handleLightX = this.handleLightX.bind(this);
    this.handleLightY = this.handleLightY.bind(this);
    this.handleLightZ = this.handleLightZ.bind(this);
    this.handleScale = this.handleScale.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleColorWater = this.handleColorWater.bind(this);
    this.handleColorEarth = this.handleColorEarth.bind(this);
    this.handleColorMountains = this.handleColorMountains.bind(this);
    this.handleColorSnow = this.handleColorSnow.bind(this);

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
      lightX: 0.6,
      lightY: 0.55,
      lightZ: 0.35,
      scale: 0.2,
      touchStartPosition: null,
      mousePressed: false,
      waterColor: {
        r: '21.0',
        g: '135.0',
        b: '259.0',
        a: 1
      },
      snowColor: {
        r: '255.0',
        g: '255.0',
        b: '255.0',
        a: 1
      },
      mountainsColor: {
        r: '140.0',
        g: '80.0',
        b: '9.0',
        a: 1
      },
      earthColor: {
        r: '92.0',
        g: '170.0',
        b: '30.0',
        a: 1
      },
      //waterColor: [255.0 / 255.0, g: 255.0 / 255.0, b: 255.0 / 255.0, a: 1],
      //earthColor: {r: 140.0 / 255.0, g: 80.0 / 255.0, b: 9.0 / 255.0, a: 1},
      //mountainsColor: {r: 92.0 / 255.0, g: 170.0 / 255.0, b: 30.0 / 255.0, a: 1}
      //snowColor: {r: 21.0 / 255.0, g: 135.0 / 255.0, b: 259.0 / 255.0, a: 1}
      //planetSurface: null,
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

    //// load image
    //const image = new Image();
    //image.onload = () => {
    //  this.setState({ planetSurface: render.createTexture(image) });
    //};
    //image.src = reign_image;

    // Вызов renderGL 100 кадров в секунду
    setInterval(this.renderGL, 100);
  }

  renderGL() {
    const { gl, render, planetShaderProgram, isCubeShow, isTetrahedronShow,
      translateX, translateY, translateZ, rotateX, rotateY, rotateZ, lightX, lightY, lightZ, scale,
      snowColor, waterColor, earthColor, mountainsColor
      //planetSurface
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
    gl.uniform3f(gl.getUniformLocation(planetShaderProgram, 'u_lightDir'), lightX, lightY, lightZ);
    gl.uniform3fv(gl.getUniformLocation(planetShaderProgram, 'u_snowColor'), this.convertColor(snowColor));
    gl.uniform3fv(gl.getUniformLocation(planetShaderProgram, 'u_mountainsColor'), this.convertColor(mountainsColor));
    gl.uniform3fv(gl.getUniformLocation(planetShaderProgram, 'u_earthColor'), this.convertColor(earthColor));
    gl.uniform3fv(gl.getUniformLocation(planetShaderProgram, 'u_waterColor'), this.convertColor(waterColor));

    //if (planetSurface) {
    //  gl.activeTexture(gl.TEXTURE0);
    //  gl.bindTexture(gl.TEXTURE_2D, planetSurface.texture);
    //  gl.uniform1i(gl.getUniformLocation(planetShaderProgram, 'u_sampler'), 0);
    //}

    render.drawPlanet(planetShaderProgram);

    const transform = this.getTransform3x3();
    render.endFrame(transform); // todo: move to Render
  }

  convertColor(color) {
    return [
      color.r / 255.0,
      color.g / 255.0,
      color.b / 255.0
    ]
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
    console.log(value);
    console.log(this.state.rotateY);
    this.setState({ rotateY: value });
  }

  handleRotateZ(event) {
    const { value } = event.target;
    this.setState({ rotateZ: value });
  }

  handleLightX(event) {
    const { value } = event.target;
    this.setState({ lightX: value });
  }

  handleLightY(event) {
    const { value } = event.target;
    this.setState({ lightY: value });
  }

  handleLightZ(event) {
    const { value } = event.target;
    this.setState({ lightZ: value });
  }

  handleScale(event) {
    const { value } = event.target;
    this.setState({ scale: value });
  }

  handleMouseDown() {
    //const { clientX, clientY } = event;
    this.setState({ mousePressed: true });
  }

  handleMouseMove(event) {
    const { movementX, movementY } = event;
    if ( this.state.mousePressed ){
      this.setState((state) => {
        return {
          rotateX: state.rotateX - movementY,
          rotateY: Number(state.rotateY) + movementX
        }
      });
    }
  }

  handleMouseUp() {
    this.setState({ mousePressed: false });
  }

  handleColorWater(waterColor) {
    this.setState({ waterColor });
  }

  handleColorEarth(earthColor) {
    this.setState({ earthColor });
  }

  handleColorMountains(mountainsColor) {
    this.setState({ mountainsColor });
  }

  handleColorSnow(snowColor) {
    this.setState({ snowColor });
  }


    render() {
    const {
      canvasWidth, canvasHeight, translateX, translateY, translateZ, rotateX, rotateY, rotateZ,
      lightX, lightY, lightZ, scale,
      waterColor, earthColor, mountainsColor, snowColor
    } = this.state;

    return (
      <section className={ styles.wrapper }>
        <header className={ styles.header }>
          <div className={ styles['column-header'] }>
            <h3>Translate</h3>
            <label htmlFor='translateX'>
              <span className={ styles.rangeCaption }>translateX:</span>
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
              <span className={ styles.rangeCaption }>translateY:</span>
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
              <span className={ styles.rangeCaption }>translateZ:</span>
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
              <span className={ styles.rangeCaption }>rotateX:</span>
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
              <span className={ styles.rangeCaption }>rotateY:</span>
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
              <span className={ styles.rangeCaption }>rotateZ:</span>
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
            <h3>Light</h3>
            <label htmlFor='lightX'>
              <span className={ styles.rangeCaption }>lightX:</span>
              <input
                id='lightX'
                type='range'
                min='-1'
                max='1'
                step='0.05'
                value={ lightX }
                onChange={ this.handleLightX }
              />
              { lightX }
            </label>

            <label htmlFor='lightY'>
              <span className={ styles.rangeCaption }>lightY:</span>
              <input
                id='lightY'
                type='range'
                min='-1'
                max='1'
                step='0.05'
                value={ lightY }
                onChange={ this.handleLightY }
              />
              { lightY }
            </label>

            <label htmlFor='lightZ'>
              <span className={ styles.rangeCaption }>lightZ:</span>
              <input
                id='lightZ'
                type='range'
                min='-1'
                max='1'
                step='0.05'
                value={ lightZ }
                onChange={ this.handleLightZ }
              />
              { lightZ }
            </label>
          </div>

          <div className={ styles['column-header'] }>
            <h3>Scale</h3>
            <label htmlFor='scale'>
              <span className={ styles.rangeCaption } >scale:</span>
              <input
                id='scale'
                type='range'
                min='0.1'
                max='1'
                step='0.05'
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
        <aside className={ styles.aside }>
          <h3>Planet Colors</h3>
          <label>
            <span className={ styles.rangeCaption }>Water:</span>
            <ColorPicker
              color={ waterColor }
              onChange={ this.handleColorWater }
            />
          </label>
          <label>
            <span className={ styles.rangeCaption }>Earth:</span>
            <ColorPicker
              color={ earthColor }
              onChange={ this.handleColorEarth }
            />
          </label>
          <label>
            <span className={ styles.rangeCaption }>Mountains:</span>
            <ColorPicker
              color={ mountainsColor }
              onChange={ this.handleColorMountains }
            />
          </label>
          <label>
            <span className={ styles.rangeCaption }>Snow:</span>
            <ColorPicker
              color={ snowColor }
              onChange={ this.handleColorSnow }
            />
          </label>
        </aside>
      </section>
    )
  }
}

export default Planet;