import React from 'react';
import {makeStyles} from '@material-ui/core';
import log from 'loglevel';

const vertexShaderSource = `#version 300 es
in vec4 a_position;
void main(){
  gl_Position = a_position;
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 outColor;
void main(){
  outColor = vec4(1, 0, 0.5, 1);
}`;

function createShader(ctx: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = ctx.createShader(type);
  if (!shader) {
    log.error(`failed to create shader for type ${type}`);
    return null;
  }
  ctx.shaderSource(shader, source);
  ctx.compileShader(shader);
  const success = ctx.getShaderParameter(shader, ctx.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  log.error(`failed to compile shader: ${ctx.getShaderInfoLog(shader)}`);
  ctx.deleteShader(shader);
  return null;
}

function createProgram(
  ctx: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
): WebGLProgram | null {
  const program = ctx.createProgram();
  if (!program) {
    log.error('failed to create program');
    return null;
  }
  ctx.attachShader(program, vertexShader);
  ctx.attachShader(program, fragmentShader);
  ctx.linkProgram(program);
  const success = ctx.getProgramParameter(program, ctx.LINK_STATUS);
  if (success) {
    return program;
  }
  log.error(`failed to link program: ${ctx.getProgramInfoLog(program)}`);
  ctx.deleteProgram(program);
  return null;
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const cssToRealPixels = window.devicePixelRatio || 1;

  const displayWidth = Math.floor(canvas.clientWidth * cssToRealPixels);
  const displayHeight = Math.floor(canvas.clientHeight * cssToRealPixels);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
}

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
    const vertexShader = createShader(ctx, ctx.VERTEX_SHADER, vertexShaderSource);
    if (!vertexShader) {
      // error logged in create shader
      return;
    }
    const fragmentShader = createShader(ctx, ctx.FRAGMENT_SHADER, fragmentShaderSource);
    if (!fragmentShader) {
      return;
    }
    const program = createProgram(ctx, vertexShader, fragmentShader);
    if (!program) {
      return;
    }
    const positionAttributeLocation = ctx.getAttribLocation(program, 'a_position');
    const positionBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, positionBuffer);

    const positions = [0, 0, 0, 0.5, 0.7, 0];
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(positions), ctx.STATIC_DRAW);
    const vao = ctx.createVertexArray();
    ctx.bindVertexArray(vao);
    ctx.enableVertexAttribArray(positionAttributeLocation);

    const size = 2;
    const type = ctx.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    ctx.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

    resizeCanvas(canvas);
    ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.clearColor(0, 0, 0, 0);
    ctx.clear(ctx.COLOR_BUFFER_BIT);
    ctx.useProgram(program);
    ctx.bindVertexArray(vao);
    ctx.drawArrays(ctx.TRIANGLES, 0, 3);
  });

  return <canvas className={styles.canvas} width="800px" height="600px" ref={canvasRef}></canvas>;
};

export default Universe;
