import React, { Component } from 'react';
import DrawingPage from './components/DrawingPage';
import Planet from './components/Planet';
import styles from './App.css';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);

    this.state = {
      showingPage: 'planet'
    }
  };
  render() {
    const { showingPage } = this.state;
    return (
      <div className={ styles.app }>
        <header>
          <form className={ styles['tabs'] }>
            <input
              className={ styles['tab-control'] }
              type='radio'
              id='drawingBoard'
              name='page'
              value='drawingBoard'
              checked={ showingPage === 'drawingBoard' }
              onChange={ this.handleChange }
             />
            <label htmlFor='drawingBoard' className={ styles['tab-label'] }>Drawing Board</label>

            <input
              className={ styles['tab-control'] }
              type='radio'
              id='planet'
              name='page'
              value='planet'
              checked={ showingPage === 'planet' }
              onChange={ this.handleChange }
            />
            <label htmlFor='planet' className={ styles['tab-label'] }>Planet</label>
          </form>
        </header>
        { showingPage === 'drawingBoard' && <DrawingPage />}
        { showingPage === 'planet' && <Planet /> }
      </div>
    );
  }

  handleChange(event) {
    this.setState({
      showingPage: event.target.value
    });
  }
}

export default App;
