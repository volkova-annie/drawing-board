import { Component } from 'react';
import React from 'react';
import { SketchPicker } from 'react-color';
import styles from './styles.css';

class ColorPicker extends Component {
  constructor(props) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleChange = this.handleChange.bind(this);

    this.state = {
      displayColorPicker: false,
      color: {}
    };
  }

  handleClick() {
    this.setState({ displayColorPicker: !this.state.displayColorPicker })
  };

  handleClose() {
    this.setState({ displayColorPicker: false })
  };

  handleChange(color) {
    //this.setState({ color: color.rgb })
    this.props.onChange(color.rgb);
  };

  render() {
    const colorStyles = { background: `rgba(${ this.props.color.r }, ${ this.props.color.g }, ${ this.props.color.b }, ${ this.props.color.a })`};

    return (
      <div>
        <div className={ styles.swatch } onClick={ this.handleClick }>
          <div className={ styles.color } style={ colorStyles }/>
        </div>
        { this.state.displayColorPicker ? <div className={ styles.popover }>
          <div className={ styles.cover } onClick={ this.handleClose }/>
          <SketchPicker color={ this.props.color } onChange={ this.handleChange } />
        </div> : null }

      </div>
    )
  }
}

export default ColorPicker