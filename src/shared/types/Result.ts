/**
 * Result 타입: 성공/실패를 명시적으로 표현
 */
export class Result<T, E extends Error = Error> {
  private constructor(
    private readonly success: boolean,
    private readonly _value?: T,
    private readonly _error?: E
  ) {}

  static ok<T, E extends Error = Error>(value: T): Result<T, E> {
    return new Result<T, E>(true, value, undefined);
  }

  static fail<T, E extends Error = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  isOk(): boolean {
    return this.success;
  }

  isError(): boolean {
    return !this.success;
  }

  get value(): T {
    if (!this.success) {
      throw new Error('Result가 실패 상태입니다. value에 접근할 수 없습니다.');
    }
    return this._value as T;
  }

  get error(): E {
    if (this.success) {
      throw new Error('Result가 성공 상태입니다. error에 접근할 수 없습니다.');
    }
    return this._error as E;
  }

  /**
   * 성공 시 값을 변환
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.success) {
      return Result.ok(fn(this._value as T));
    }
    return Result.fail(this._error as E);
  }

  /**
   * 성공 시 Result를 반환하는 함수 실행
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.success) {
      return fn(this._value as T);
    }
    return Result.fail(this._error as E);
  }

  /**
   * 값 또는 기본값 반환
   */
  getOrElse(defaultValue: T): T {
    return this.success ? (this._value as T) : defaultValue;
  }
}
