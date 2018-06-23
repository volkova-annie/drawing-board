import React, {Component} from 'react';
import styles from "./styles.css"

class DrawingPage extends Component {
  constructor(props) {
    super(props);
    this.fill = this.fill.bind(this);
    this.clear = this.clear.bind(this);
  }

  componentDidMount() {
    const canvas = this.refs.canvas;
    this.ctx = canvas.getContext("2d");
  }

  fill (color) {
    const canvas = this.refs.canvas;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle=color;
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  clear () {
    const canvas = this.refs.canvas;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  render() {
    return (
      <div>
        <canvas ref="canvas" width={this.props.width} height={this.props.height} className={styles.board}></canvas>
      </div>
    )
  }
}

export default DrawingPage;