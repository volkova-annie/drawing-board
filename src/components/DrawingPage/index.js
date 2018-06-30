import React, {Component} from 'react';
import DrawingBoard from '../DrawingBoard';
import classnames from 'classnames';
import styles from "./styles.css"

class DrawingPage extends Component {
  constructor(props) {
    super(props);

    this.getColor = this.getColor.bind(this);
  };

  getColor() {
    const color = document.getElementById('color').value;
    return color;
  }

  render() {
    return (
      <div className={styles.wrapper}>
        <div className={styles.panel}>
          <label htmlFor="color">
            Choose color:
          </label>
          <input id="color" type="color" />
          <button onClick={() => this.board.fill(this.getColor())}>Fill</button>
          <button onClick={() => this.board.clear()} className={styles.clear}>Clear</button>
        </div>
        <DrawingBoard width="700px" height="500px" ref={instance => {this.board = instance}} />
      </div>
    )
  }
}

export default DrawingPage;