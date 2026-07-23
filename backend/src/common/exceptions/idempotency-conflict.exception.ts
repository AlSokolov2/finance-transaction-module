import { HttpException, HttpStatus } from "@nestjs/common";

export class IdempotencyConflictException extends HttpException {
  constructor() {
    super(
      "Idempotency key already used with different payload",
      HttpStatus.CONFLICT
    );
  }
}
