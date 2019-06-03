import { Component } from 'react';
import React from 'react';
import ColorPicker from '../ColorPicker';
import Render from '../../render/render'
import Vec3 from '../../render/vec3'
import {
  vertexPlanetShaderSource,
  planetFragmentShaderSource,
  cloudsVertexShaderSource,
  cloudsFragmentShaderSource
} from '../../render/shaders';
import * as math from 'mathjs';
import styles from './styles.css';
import Camera from '../../render/camera';
//import reign_image from '../../images/rhein.jpg';

class Planet extends Component {
  constructor(props) {
    super(props);

    this.renderGL = this.renderGL.bind(this);
    this.handleTranslateX = this.handleTranslateX.bind(this);
    this.handleTranslateY = this.handleTranslateY.bind(this);
    this.handleTranslateZ = this.handleTranslateZ.bind(this);
    this.handleCameraX = this.handleCameraX.bind(this);
    this.handleCameraY = this.handleCameraY.bind(this);
    this.handleCameraZ = this.handleCameraZ.bind(this);
    this.handleLightX = this.handleLightX.bind(this);
    this.handleLightY = this.handleLightY.bind(this);
    this.handleLightZ = this.handleLightZ.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleColorWater = this.handleColorWater.bind(this);
    this.handleColorEarth = this.handleColorEarth.bind(this);
    this.handleColorMountains = this.handleColorMountains.bind(this);
    this.handleColorSnow = this.handleColorSnow.bind(this);
    this.handleWaterLevel = this.handleWaterLevel.bind(this);

    this.planet = React.createRef();

    this.state = {
      render: null,
      camera: null,
      canvasWidth: 1024,
      canvasHeight: 512,
      gl: null,
      planetShaderProgram: null,
      cloudsShaderProgram: null,
      isTetrahedronShow: false,
      isCubeShow: false,
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      cameraX: 0,
      cameraY: 0,
      cameraZ: 2.5,
      lightX: 0.6,
      lightY: 0.55,
      lightZ: 0.35,
      touchStartPosition: null,
      mousePressed: false,
      waterLevel: 0.55,
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
      bgPlanetColor: [4 / 255, 5 / 255, 45 / 255, 1],
    }
  }

  componentDidMount() {
    const gl = this.planet.current.getContext('webgl');

    if (!gl) {
      console.log('No webgl!');
      return;
    }

    const { translateX, translateY, translateZ } = this.state;
    const camera = new Camera(new Vec3(Number(translateX), Number(translateY), Number(translateZ)), new Vec3(0.0, 0.0, 0.0), new Vec3(0.0, 1.0, 0.0));

    const render = new Render(gl, this.state.canvasWidth, this.state.canvasHeight);

    const vertexShader = render.createShader(gl, gl.VERTEX_SHADER, vertexPlanetShaderSource);
    const planetFragmentShader = render.createShader(gl, gl.FRAGMENT_SHADER, planetFragmentShaderSource);
    const planetShaderProgram = render.createProgram(gl, vertexShader, planetFragmentShader);

    const cloudVertexShader = render.createShader(gl, gl.VERTEX_SHADER, cloudsVertexShaderSource);
    const cloudFragmentShader = render.createShader(gl, gl.FRAGMENT_SHADER, cloudsFragmentShaderSource);
    const cloudsShaderProgram = render.createProgram(gl, cloudVertexShader, cloudFragmentShader);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.setState({
      gl,
      render,
      camera,
      planetShaderProgram,
      cloudsShaderProgram
    });

    // Вызов renderGL 100 кадров в секунду
    //setInterval(this.renderGL, 100);

    requestAnimationFrame(this.renderGL);
  }

  renderGL() {
    const { gl, render, planetShaderProgram, cloudsShaderProgram, camera,
      cameraX, cameraY, cameraZ, lightX, lightY, lightZ,
      snowColor, waterColor, earthColor, mountainsColor, waterLevel, bgPlanetColor
    } = this.state;

    render.bgPlanetColor = bgPlanetColor;

    render.beginFrame();

    const FRACTION = 100000;
    const time = new Date().getTime(); // 1556361728843;
    const currentTime = (time * 5 % FRACTION) / FRACTION;

    gl.useProgram(planetShaderProgram);

    camera.position = new Vec3(Number(cameraX), Number(cameraY), Number(cameraZ));

    gl.uniformMatrix4fv(gl.getUniformLocation(planetShaderProgram, 'u_projection'), false, this.getPerspectiveMatrix());

    const planetAngleY = (time / 10000 * -10 % 360);
    const modelPlanetTransform = this.getTransform({ rotateY: planetAngleY });
    gl.uniformMatrix4fv(gl.getUniformLocation(planetShaderProgram, 'u_transform'), false, modelPlanetTransform);
    gl.uniform3f(gl.getUniformLocation(planetShaderProgram, 'u_lightDir'), lightX, lightY, lightZ);
    gl.uniform3fv(gl.getUniformLocation(planetShaderProgram, 'u_snowColor'), this.convertColor(snowColor));
    gl.uniform3fv(gl.getUniformLocation(planetShaderProgram, 'u_mountainsColor'), this.convertColor(mountainsColor));
    gl.uniform3fv(gl.getUniformLocation(planetShaderProgram, 'u_earthColor'), this.convertColor(earthColor));
    gl.uniform3fv(gl.getUniformLocation(planetShaderProgram, 'u_waterColor'), this.convertColor(waterColor));
    gl.uniform1f(gl.getUniformLocation(planetShaderProgram, 'u_waterLevel'), waterLevel);

    gl.uniform3f(gl.getUniformLocation(planetShaderProgram, 'u_eye'), camera.position.x, camera.position.y, camera.position.z);

    render.drawPlanet(planetShaderProgram);

    gl.useProgram(cloudsShaderProgram);

    const cloudsScale = 1.03;
    const cloudsAngleY = (time / 10000 * 10 % 360);
    const cloudsTransform = this.getTransform({rotateY: cloudsAngleY, scale: cloudsScale});
    gl.uniformMatrix4fv(gl.getUniformLocation(cloudsShaderProgram, 'u_projection'), false, this.getPerspectiveMatrix());
    gl.uniformMatrix4fv(gl.getUniformLocation(cloudsShaderProgram, 'u_transform'), false, cloudsTransform);
    gl.uniform3f(gl.getUniformLocation(cloudsShaderProgram, 'u_lightDir'), lightX, lightY, lightZ);
    gl.uniform1f(gl.getUniformLocation(cloudsShaderProgram, 'u_time'), currentTime);
    gl.uniform3f(gl.getUniformLocation(cloudsShaderProgram, 'u_eye'), camera.position.x, camera.position.y, camera.position.z);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    render.drawPlanet(cloudsShaderProgram);
    gl.disable(gl.BLEND);

    render.fxaa();

    const transform = this.getTransform3x3();
    render.endFrame(transform); // todo: move to Render

    requestAnimationFrame(this.renderGL);
  }

  convertColor(color) {
    return [
      color.r / 255.0,
      color.g / 255.0,
      color.b / 255.0
    ]
  }

  getPerspectiveMatrix() {
    const { canvasWidth, canvasHeight, camera } = this.state;

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
    const c = (f + n) / (n - f);
    const d = 2 * f * n / (n - f);
    const perspective = math.matrix([
      [a0, 0, 0, 0],
      [0, a1, 0, 0],
      [0,  0, c, -1],
      [0,  0, d, 0]
    ]);

    const view_projection = math.multiply(camera.transform, perspective);

    return math.flatten(view_projection).toArray();
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

  handleCameraX(event) {
    const { value } = event.target;
    this.setState({ cameraX: value });
  }

  handleCameraY(event) {
    const { value } = event.target;
    this.setState({ cameraY: value });
  }

  handleCameraZ(event) {
    const { value } = event.target;
    this.setState({ cameraZ: value });
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

  handleMouseDown() {
    //const { clientX, clientY } = event;
    this.setState({ mousePressed: true });
  }

  handleMouseMove(event) {
    const { movementX, movementY } = event;
    const min = -1;
    const max = 1;
    if ( this.state.mousePressed ){
      this.setState((state) => {
        return {
          cameraX: Math.min(Math.max(state.cameraX - movementX * 0.05, min), max).toFixed(2),
          cameraY: Math.min(Math.max(Number(state.cameraY) + movementY * 0.05, min), max).toFixed(2)
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

  handleWaterLevel(event) {
    const waterLevel = event.target.value;
    this.setState({ waterLevel });
  }

  render() {
    const {
      canvasWidth, canvasHeight, cameraX, cameraY, cameraZ,
      lightX, lightY, lightZ, bgPlanetColor,
      waterColor, earthColor, mountainsColor, snowColor, waterLevel
    } = this.state;

    const bgColor = { background: `rgba(${ bgPlanetColor[0] * 255}, ${ bgPlanetColor[1] * 255}, ${ bgPlanetColor[2] * 255 }, ${ bgPlanetColor[3] })`};

    return (
      <section className={ styles.wrapper }>
        <div className={ styles.controls }>
          <div className={ styles['column-controls'] }>
            <h3>Camera</h3>
            <label htmlFor='cameraX'>
              <span className={ styles.rangeCaption }>cameraX:</span>
              <input
                id='cameraX'
                type='range'
                min='-1'
                max='1'
                step='0.1'
                value={ cameraX }
                onChange={ this.handleCameraX }
              />
              { cameraX }
            </label>

            <label htmlFor='cameraY'>
              <span className={ styles.rangeCaption }>cameraY:</span>
              <input
                id='cameraY'
                type='range'
                min='-1'
                max='1'
                step='0.1'
                value={ cameraY }
                onChange={ this.handleCameraY }
              />
              { cameraY }
            </label>
            <label htmlFor='cameraZ'>
              <span className={ styles.rangeCaption }>cameraZ:</span>
              <input
                id='cameraZ'
                type='range'
                min='2'
                max='10'
                step='0.1'
                value={ cameraZ }
                onChange={ this.handleCameraZ }
              />
              { cameraZ }
            </label>
          </div>

          <div className={ styles['column-controls'] }>
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
          <div className={ styles.aside }>
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
            <h3>Water Level</h3>
            <label htmlFor='waterLevel'>
              { Number(waterLevel).toFixed(2) }
              <input
                  id='waterLevel'
                  type='range'
                  min='0'
                  max='1'
                  step='0.05'
                  value={ waterLevel }
                  onChange={ this.handleWaterLevel }
              />
            </label>
          </div>
        </div>
        <div>
          <canvas
            ref={ this.planet }
            width={ canvasWidth }
            height={ canvasHeight }
            onMouseDown={ this.handleMouseDown }
            onMouseMove={ this.handleMouseMove }
            onMouseUp={ this.handleMouseUp }
            style={{ position: 'absolute', left: 'calc(50% - 512px)' }}
          />
        </div>
        <div className={styles.background} style={ bgColor } />
      </section>
    )
  }
}

export default Planet;
