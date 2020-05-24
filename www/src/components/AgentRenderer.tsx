import React from 'react';
import {makeStyles} from '@material-ui/core';
import log from 'loglevel';
import BufferedQueue from '../utils/bufferedQueue';
import {abvt} from '../msg/simstep_generated';

const {flatbuffers} = require('flatbuffers');

const vertexShaderSource = `#version 300 es
in vec2 a_position;
in float a_color;

out float v_color;

void main(){
  vec2 zeroToTwo = a_position * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  gl_PointSize = 5.0;
  v_color = a_color;
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;
in float v_color;
out vec4 outColor;

// taken from https://gist.github.com/mikhailov-work/0d177465a8151eb6ede1768d51d476c7
// change saturate to clamp
vec3 TurboColormap(in float x) {
  const vec4 kRedVec4 = vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234);
  const vec4 kGreenVec4 = vec4(0.09140261, 2.19418839, 4.84296658, -14.18503333);
  const vec4 kBlueVec4 = vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771);
  const vec2 kRedVec2 = vec2(-152.94239396, 59.28637943);
  const vec2 kGreenVec2 = vec2(4.27729857, 2.82956604);
  const vec2 kBlueVec2 = vec2(-89.90310912, 27.34824973);
  
  x =  clamp(x, 0.0, 1.0);
  vec4 v4 = vec4( 1.0, x, x * x, x * x * x);
  vec2 v2 = v4.zw * v4.z;
  return vec3(
    dot(v4, kRedVec4)   + dot(v2, kRedVec2),
    dot(v4, kGreenVec4) + dot(v2, kGreenVec2),
    dot(v4, kBlueVec4)  + dot(v2, kBlueVec2)
  );
}

void main(){
  vec3 riskColor = TurboColormap(v_color);
  outColor = vec4(riskColor, 1);
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

function resizeCanvas(canvas: HTMLCanvasElement, ctx: WebGL2RenderingContext) {
  const cssToRealPixels = window.devicePixelRatio || 1;

  const displayWidth = Math.floor(canvas.clientWidth * cssToRealPixels);
  const displayHeight = Math.floor(canvas.clientHeight * cssToRealPixels);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    ctx.viewport(0, 0, displayWidth, displayWidth);
  }
}

function drawAgents(
  ctx: WebGL2RenderingContext,
  positionBuffer: WebGLBuffer,
  positionLocation: number,
  positions: Float32Array,
  colorBuffer: WebGLBuffer,
  colorLocation: number,
  colors: Float32Array,
) {
  ctx.bindBuffer(ctx.ARRAY_BUFFER, positionBuffer);
  ctx.bufferData(ctx.ARRAY_BUFFER, positions, ctx.STATIC_DRAW);
  ctx.enableVertexAttribArray(positionLocation);
  ctx.vertexAttribPointer(positionLocation, 2, ctx.FLOAT, false, 0, 0);

  ctx.bindBuffer(ctx.ARRAY_BUFFER, colorBuffer);
  ctx.bufferData(ctx.ARRAY_BUFFER, colors, ctx.STATIC_DRAW);
  ctx.enableVertexAttribArray(colorLocation);
  ctx.vertexAttribPointer(colorLocation, 1, ctx.FLOAT, false, 0, 0);

  requestAnimationFrame((_) => ctx.drawArrays(ctx.POINTS, 0, colors.length));
}

async function messageProcessor(
  gl: WebGL2RenderingContext,
  queue: BufferedQueue<Uint8Array | null>,
  positionBuffer: WebGLBuffer,
  positionAttributeLocation: number,
  colorBuffer: WebGLBuffer,
  colorAttributeLocation: number,
) {
  log.info('initiating message processor');
  for await (const packet of queue) {
    if (!packet) {
      log.info('terminating message processor');
      return;
    }
    const buf = new flatbuffers.ByteBuffer(packet);
    const msg = abvt.SimStep.getRootAsSimStep(buf);

    log.info(`drawing step ${msg.idx().toFloat64()}`);
    const positionsArray = msg.positionsArray();
    const scoreArray = msg.scoreArray();

    if (!positionsArray) {
      log.error('undefined positions');
      continue;
    }
    if (!scoreArray) {
      log.error('undefined scores');
      continue;
    }

    drawAgents(
      gl,
      positionBuffer,
      positionAttributeLocation,
      positionsArray,
      colorBuffer,
      colorAttributeLocation,
      scoreArray,
    );
  }
}

const useStyles = makeStyles({
  canvas: {
    border: '1px solid black',
  },
});

const WIDTH = 1000;
const HEIGHT = 800;

interface AgentRendererProps {
  queue: BufferedQueue<Uint8Array | null>;
}

const AgentRenderer: React.FC<AgentRendererProps> = ({queue}: AgentRendererProps) => {
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
    const positionBuffer = ctx.createBuffer();
    if (!positionBuffer) {
      log.error('position buffer could not be created');
      return;
    }
    const colorBuffer = ctx.createBuffer();
    if (!colorBuffer) {
      log.error('color buffer not bound');
      return;
    }

    const positionAttributeLocation = ctx.getAttribLocation(program, 'a_position');
    const colorAttributeLocation = ctx.getAttribLocation(program, 'a_color');

    const vao = ctx.createVertexArray();
    ctx.bindVertexArray(vao);

    ctx.clearColor(0, 0, 0, 0);
    ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
    ctx.useProgram(program);
    resizeCanvas(canvas, ctx);
    ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height); // setup call necessary

    messageProcessor(ctx, queue, positionBuffer, positionAttributeLocation, colorBuffer, colorAttributeLocation);
  });

  return <canvas className={styles.canvas} width={`${WIDTH}px`} height={`${HEIGHT}px`} ref={canvasRef}></canvas>;
};

export default AgentRenderer;
