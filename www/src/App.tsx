import 'typeface-roboto';
import React from 'react';
import ReactDOM from 'react-dom';
import CssBaseline from '@material-ui/core/CssBaseline';
import AgentRenderer from './components/AgentRenderer';
import log from 'loglevel';
import TitleBar from './components/TitleBar';
import BufferedQueue from './utils/bufferedQueue';

declare const DEVELOPMENT_BUILD: boolean;

declare const WEBSOCKET_URL: string;

const QUEUE_SIZE = 8;

if (DEVELOPMENT_BUILD) {
  log.setLevel(log.levels.INFO, true);
} else {
  log.setLevel(log.levels.WARN, true);
}

enum SocketState {
  Pending,
  Initialized,
  Closed,
}
class AppState {
  readonly socketState: SocketState;

  readonly socket: WebSocket | null;

  readonly queue: BufferedQueue<Uint8Array | null> | null;

  private constructor(
    socketState: SocketState,
    socket: WebSocket | null,
    queue: BufferedQueue<Uint8Array | null> | null,
  ) {
    this.socketState = socketState;
    this.socket = socket;
    this.queue = queue;
  }

  static readonly pending: AppState = new AppState(SocketState.Pending, null, null);

  static readonly closed: AppState = new AppState(SocketState.Closed, null, null);

  static initialized(socket: WebSocket) {
    const queue = new BufferedQueue<Uint8Array | null>(QUEUE_SIZE);
    socket.onmessage = (ev: MessageEvent) => queue.push(new Uint8Array(ev.data));
    return new AppState(SocketState.Initialized, socket, queue);
  }
}

const App: React.FC<{}> = () => {
  const [state, setState] = React.useState<AppState>(AppState.pending);

  React.useEffect(() => {
    if (state.socketState === SocketState.Pending) {
      log.info('creating websocket');
      const socket = new WebSocket(WEBSOCKET_URL);
      socket.binaryType = 'arraybuffer';
      socket.onopen = (_: Event) => setState(AppState.initialized(socket));
      socket.onclose = (_: Event) => {
        log.info('socket closed by server');
        setState(AppState.closed);
      };
      socket.onerror = (_: Event) => {
        log.info('socket error. closing');
        setState(AppState.closed);
      };
    }

    return () => {
      if (state.socketState === SocketState.Initialized) {
        const {socket, queue} = state;
        if (queue) {
          queue.push(null);
          queue.terminate();
        }
        if (!socket) {
          return;
        }
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
          // already closed;
          return;
        }
        log.info('closing websocket');
        socket.close();
      }
    };
  });

  if (state.socketState === SocketState.Pending) {
    return <div>Initializing</div>;
  }
  if (state.socketState === SocketState.Initialized) {
    const {queue} = state;
    if (!queue) {
      return <div>Invariant Failure</div>;
    }
    return <AgentRenderer queue={queue} />;
  }
  return <div>Closed</div>;
};

const NormalizedApp: React.FC<{}> = () => (
  <>
    <CssBaseline />
    <TitleBar />
    <App />
  </>
);

ReactDOM.render(<NormalizedApp />, document.getElementById('app'));

console.log('ho gaya');
