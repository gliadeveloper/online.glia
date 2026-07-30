export class KakaoAuthError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "KakaoAuthError";
  }
}
