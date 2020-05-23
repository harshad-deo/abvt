import 'typeface-roboto';
import React from 'react';
import ReactDOM from 'react-dom';
import CssBaseline from '@material-ui/core/CssBaseline';
import {makeStyles, AppBar, Toolbar, Typography} from '@material-ui/core';
import Universe from './components/Universe';
import log from 'loglevel';

declare const DEVELOPMENT_BUILD: boolean;

if (DEVELOPMENT_BUILD) {
  log.setLevel(log.levels.INFO, true);
} else {
  log.setLevel(log.levels.WARN, true);
}

const useStyles = makeStyles({
  root: {
    flexGrow: 1,
  },
  title: {
    flexGrow: 1,
  },
});

const App: React.FC<{}> = () => {
  const styles = useStyles();

  return (
    <>
      <CssBaseline />
      <div className={styles.root}>
        <AppBar position="static">
          <Toolbar variant="dense">
            <Typography variant="h6" className={styles.title}>
              Agent Based ViraTrace
            </Typography>
          </Toolbar>
        </AppBar>
        <Universe />
      </div>
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));

console.log('ho gaya');
