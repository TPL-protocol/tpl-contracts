import React, { Component } from 'react';
import './App.css';

class App extends Component {
  createCat = (dna) => {
    let column = []

    for (let i = 0; i < 8; i++) {
      let row = []
      for (let j = 0; j < 8; j++) {
        const color = dna[i+j*8]
        const choice = j + i*8 < 10 ? `0${j + i*8}` : `${j + i*8}`
        const imgUrl = `images/copycat-${color}/${choice}.png`
        row.push(
          <td>
            <div style={{height: "50px"}}>
              <img src={imgUrl} alt="img"/>
            </div>
          </td>
        )
      }
      column.push(<tr>{row}</tr>)
    }
    return column
  }

  render(props) {
    const exampleDna = process.env.REACT_APP_DNA

    return (
      <div className="App">
        <header className="App-header">
          <table cellspacing={"0"} cellpadding={"0"}>
            {this.createCat(exampleDna)}
          </table>
        </header>
      </div>
    );
  }
}

export default App;
