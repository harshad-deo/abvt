import DeferredPromise from './deferredPromise';

export default class BufferedQueue<T> implements AsyncIterable<T> {
  private readonly queue: DeferredPromise<T>[];

  private readonly mask: number;

  readPtr: number;

  private writePtr: number;

  private terminated: boolean;

  constructor(size: number) {
    const queueLen = 1 << size;

    this.queue = new Array<DeferredPromise<T>>(queueLen);
    for (let i = 0; i < queueLen; i += 1) {
      this.queue[i] = new DeferredPromise();
    }

    this.mask = queueLen - 1;

    this.readPtr = 0;

    this.writePtr = 0;

    this.terminated = false;
  }

  async *[Symbol.asyncIterator]() {
    while (!this.terminated) {
      const idx = this.readPtr & this.mask;
      this.readPtr += 1;
      const res = await this.queue[idx].promise;
      this.queue[idx] = new DeferredPromise<T>();
      yield res;
    }
  }

  readonly push: (value: T) => void = (value) => {
    const idx = this.writePtr & this.mask;
    this.writePtr += 1;
    this.queue[idx].resolve(value);
  };

  readonly terminate: () => void = () => {
    this.terminated = true;
  };
}
