/**
 * 글로벌 에러 핸들러 미들웨어
 * Express 애플리케이션에서 발생하는 모든 에러를 처리합니다.
 *
 * @param {Error} err - 발생한 에러 객체
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 * @param {Function} next - 다음 미들웨어 호출 함수
 */
export const errorHandler = (err, req, res, next) => {
  // 에러 스택 로깅 (디버깅 용도)
  console.error("서버 에러:", err.stack);

  // 에러의 상태 코드 설정 (기본값: 500 서버 에러)
  const statusCode = err.statusCode || 500;

  // 에러 메시지 설정 (기본값: 서버 에러 메시지)
  const message = err.message || "서버 에러가 발생했습니다.";

  // 클라이언트에 에러 응답 전송
  res.status(statusCode).json({
    error: message,
    // 프로덕션 환경에서는 스택 트레이스를 숨김
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

/**
 * 비동기 라우트 핸들러를 위한 에러 래퍼 함수
 * 비동기 함수에서 발생하는 예외를 자동으로 next()로 전달합니다.
 *
 * @param {Function} fn - 비동기 라우트 핸들러 함수
 * @returns {Function} 에러 처리가 포함된 새로운 라우트 핸들러
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 사용자 정의 에러 클래스
 * 상태 코드와 메시지를 포함하는 에러 객체를 생성합니다.
 */
export class AppError extends Error {
  /**
   * @param {string} message - 에러 메시지
   * @param {number} statusCode - HTTP 상태 코드
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
