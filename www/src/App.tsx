import 'typeface-roboto';
import React from 'react';
import ReactDOM from 'react-dom';
import CssBaseline from '@material-ui/core/CssBaseline';

export default function App() {
  console.log('ho gaya');
  return (
    <>
      <CssBaseline />
    </>
  );
}

ReactDOM.render(<App />, document.getElementById('app'));
