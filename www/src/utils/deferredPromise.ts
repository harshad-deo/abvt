import log from 'loglevel';

export default class DeferredPromise<T> {
  readonly promise: Promise<T>;

  private resolveProxy: (arg: T) => void;

  private rejectProxy: (err: Error) => void;

  constructor() {
    this.resolveProxy = (arg) => log.error(`resolve not assigned: received: ${arg}`);
    this.rejectProxy = (err) => log.error(`reject not assigned: received: ${err}`);

    const me = this;
    this.promise = new Promise<T>((resolve, reject) => {
      me.resolveProxy = resolve;
      me.rejectProxy = reject;
    });
  }

  readonly resolve: (arg: T) => void = (arg) => {
    this.resolveProxy(arg);
  };

  readonly reject: (arg: Error) => void = (arg) => {
    this.rejectProxy(arg);
  };
}
