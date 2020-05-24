import 'typeface-roboto';
import React from 'react';
import ReactDOM from 'react-dom';
import CssBaseline from '@material-ui/core/CssBaseline';
import AgentRenderer from './components/AgentRenderer';
import log from 'loglevel';
import TitleBar from './components/TitleBar';

declare const DEVELOPMENT_BUILD: boolean;

declare const WEBSOCKET_URL: string;

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

  private constructor(socketState: SocketState, socket: WebSocket | null) {
    this.socketState = socketState;
    this.socket = socket;
  }

  static readonly pending: AppState = new AppState(SocketState.Pending, null);

  static readonly closed: AppState = new AppState(SocketState.Closed, null);

  static initialized(socket: WebSocket) {
    return new AppState(SocketState.Initialized, socket);
  }
}

const App: React.FC<{}> = () => {
  const [state, setState] = React.useState<AppState>(AppState.pending);

  React.useEffect(() => {
    if (state.socketState === SocketState.Pending) {
      log.info('creating websocket');
      const socket = new WebSocket(WEBSOCKET_URL);
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
        const {socket} = state;
        if (!socket) {
          return;
        }
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
    return <AgentRenderer />;
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
