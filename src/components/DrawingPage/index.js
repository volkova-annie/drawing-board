import React, {Component} from 'react';
import DrawingBoard from '../DrawingBoard';
import styles from "./styles.css"

class DrawingPage extends Component {

  render() {
    return (
      <div className={styles.wrapper}>
        <div className={styles.panel}>
          <span>Fill:</span>
          <select defaultValue="default" onChange={(event) => this.board.fill(event.target.value)}>
            <option disabled value="default">---</option>
            <option className={styles.blue} value="blue">Blue</option>
            <option className={styles.red} value="red">Red</option>
            <option className={styles.green} value="green">Green</option>
            <option className={styles.gray} value="gray">Gray</option>
            <option className={styles.yellow} value="yellow">Yellow</option>
            <option className={styles.black} value="black">Black</option>
            <option className={styles.white} value="white">White</option>
          </select>
          <button onClick={() => this.board.clear()} className={styles.clear}>Clear</button>
        </div>
        <DrawingBoard width="700px" height="500px" ref={instance => {this.board = instance}} />
      </div>
    )
  }
}

export default DrawingPage;