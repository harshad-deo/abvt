import React from 'react';
import {makeStyles, AppBar, Toolbar, Typography} from '@material-ui/core';

const useStyles = makeStyles({
  title: {
    flexGrow: 1,
  },
});

const TitleBar: React.FC<{}> = () => {
  const styles = useStyles();

  return (
    <AppBar position="static">
      <Toolbar variant="dense">
        <Typography variant="h6" className={styles.title}>
          Agent Based ViraTrace
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default TitleBar;
