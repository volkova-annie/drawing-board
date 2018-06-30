import React, {Component} from 'react';
import styles from './styles.css'

class DrawingPage extends Component {
  constructor(props) {
    super(props);
    this.fill = this.fill.bind(this);
    this.clear = this.clear.bind(this);

    this.state = {
      mouseDown: false
    };
  }

  componentDidMount() {
    const canvas = this.refs.canvas;
    this.ctx = canvas.getContext('2d');
  }

  fill(color) {
    const canvas = this.refs.canvas;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle=color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  clear() {
    const canvas = this.refs.canvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  onMouseDown() {
    this.setState({
      mouseDown: true
    });
  }

  onMouseUp() {
    this.setState({
      mouseDown: false
    });
  }

  onMouseMove(event) {
    if (this.state.mouseDown) {
      let position = {x : event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
      let size = {width : 20, height: 20 };
      this.drawRect(position, size);
    }
  }

  drawRect(position, size) {
    const canvas = this.refs.canvas;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle='black';
    ctx.fillRect(position.x - size.width / 2, position.y - size.height / 2, size.width, size.height);
  }

  render() {
    return (
      <div>
        <canvas ref='canvas'
                width={this.props.width}
                height={this.props.height}
                className={styles.board}
                onMouseDown={() => this.onMouseDown()}
                onMouseUp={() => this.onMouseUp()}
                onMouseMove={(event) => this.onMouseMove(event)}>
        </canvas>
      </div>
    )
  }
}

export default DrawingPage;