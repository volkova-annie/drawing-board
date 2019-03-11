import React, {Component} from 'react';
import DrawingBoard from '../DrawingBoard';
import Planet from '../Planet';
import styles from "./styles.css"

class DrawingPage extends Component {
  constructor(props) {
    super(props);

    this.getColor = this.getColor.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleBW = this.handleBW.bind(this);
    this.handleAnimate = this.handleAnimate.bind(this);
    this.handleRotate = this.handleRotate.bind(this);
    this.handleScale = this.handleScale.bind(this);
    this.state = {
      blurRadius: 0,
      rotationAngle: 0,
      scale: 1,
      showPlanet: true,
      showDrawingBoard: false
    }
  };

  getColor() {
    return document.getElementById('color').value;
  }

  handleReset() {
    this.updateBlurValue(0);
    this.updateRotationAngle(0);
    this.updateScale(1);
    this.board.resetBlackAndWhite();
    this.board.resetAnimation();
  }

  handleBW() {
    this.board.makeBlackWhite();
  }

  handleAnimate() {
    this.board.addAnimation();
  }

  handleBlur(event) {
    const { value } = event.target;
    this.updateBlurValue(value);
  }

  updateBlurValue(value) {
    this.board.setBlurRadius(value);
    this.setState({ blurRadius: value});
  }

  handleRotate(event) {
    const { value } = event.target;
    this.updateRotationAngle(value);
  }

  updateRotationAngle(value) {
    this.board.setRotationAngle(value);
    this.setState({ rotationAngle: value});
  }

  handleScale(event) {
    const { value } = event.target;
    this.updateScale(value);
  }

  updateScale(value) {
    this.board.setScale(value);
    this.setState({ scale: value});
  }

  render() {
    return (
      <div>
        { this.state.showPlanet && <Planet /> }
        { this.state.showDrawingBoard && <div className={styles.wrapper}>
          <div className={styles.panelRow}>
            <div className={styles.rangesZone}>
              <label htmlFor="blur">
                <span className={styles.rangeCaption}>Blur radius:</span>
                <input
                  id="blur"
                  type="range"
                  min="0"
                  max="10"
                  value={ this.state.blurRadius }
                  onChange={ this.handleBlur }
                />
                { this.state.blurRadius }
              </label>
              <label htmlFor="rotate">
                <span className={styles.rangeCaption}>Rotation:</span>
                <input
                  id="rotate"
                  type="range"
                  min="-180"
                  max="180"
                  value={ this.state.rotationAngle }
                  onChange={ this.handleRotate }
                />
                { this.state.rotationAngle } &#176;
              </label>
              <label htmlFor="scale">
                <span className={styles.rangeCaption}>Zoom:</span>
                <input
                  id="scale"
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={ this.state.scale }
                  onChange={ this.handleScale }
                />
                { (this.state.scale * 100).toFixed() } %
              </label>
            </div>
            <button onClick={ this.handleBW }>
              Black&White
            </button>
            <button onClick={ this.handleAnimate }>
              Animate me
            </button>
            <button
              onClick={ this.handleReset }>
              Reset
            </button>
          </div>
          <DrawingBoard width="700px" height="500px" ref={instance => {this.board = instance}} />
        </div>}
      </div>
    )
  }
}

export default DrawingPage;