import React from 'react';
import {makeStyles} from '@material-ui/core';
import log from 'loglevel';

const useStyles = makeStyles({
  canvas: {
    border: '1px solid black',
  },
});

const Universe: React.FC<{}> = () => {
  const styles = useStyles();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      log.error('canvas not bound to ref');
      return;
    }
    const ctx = canvas.getContext('webgl2');
    if (!ctx) {
      log.error('webgl2 context could not be constructed');
      return;
    }
  });

  return <canvas className={styles.canvas} width="800px" height="600px" ref={canvasRef}></canvas>;
};

export default Universe;
