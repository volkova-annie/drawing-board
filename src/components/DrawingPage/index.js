import React, {Component} from 'react';
import DrawingBoard from '../DrawingBoard';
import classnames from 'classnames';
import styles from "./styles.css"

class DrawingPage extends Component {
  constructor(props) {
    super(props);

    this.getColor = this.getColor.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleBW = this.handleBW.bind(this);
    this.state = {
      blurRadius: 0
    }
  };

  getColor() {
    return document.getElementById('color').value;
  }

  handleReset() {
    this.updateSliderValue(0);
    this.board.resetBlackAndWhite();
  }

  handleBW() {
    this.board.makeBlackWhite();
  }

  handleChange(event) {
    const value = event.target.value;
    this.updateSliderValue(value);
  }

  updateSliderValue(value) {
    this.board.setBlurRadius(value);
    this.setState({ blurRadius: value});
  }

  render() {
    return (
      <div className={styles.wrapper}>
        <div className={styles.panel}>
          {/*<label htmlFor="color">*/}
            {/*Choose color:*/}
          {/*</label>*/}
          {/*<input id="color" type="color" />*/}
          <label htmlFor="blur">Blur radius:</label>
          <input
            id="blur"
            type="range"
            min="0"
            max="10"
            value={ this.state.blurRadius }
            onChange={ this.handleChange }
          />
          {/*<button disabled={true} onClick={() => this.board.fill(this.getColor())} className={styles.disabled}>Fill</button>*/}
          {/*<button disabled={true} onClick={() => this.board.clear()} className={styles.disabled}>Clear</button>*/}
          <button onClick={ this.handleBW }>
            Black&White
          </button>
          <button
            onClick={ this.handleReset }
            className={styles.clear}>
            Reset
          </button>
        </div>
        <DrawingBoard width="700px" height="500px" ref={instance => {this.board = instance}} />
      </div>
    )
  }
}

export default DrawingPage;