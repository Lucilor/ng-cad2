export const Debounce =
  (wait: number): MethodDecorator =>
  (target: any, key: string | symbol, descriptor: PropertyDescriptor) => {
    const timeoutKey = Symbol();
    const original = descriptor.value;
    descriptor.value = function (this: any, ...args: any[]) {
      clearTimeout(this[timeoutKey]);
      this[timeoutKey] = setTimeout(() => original.apply(this, args), wait);
    };
    return descriptor;
  };
