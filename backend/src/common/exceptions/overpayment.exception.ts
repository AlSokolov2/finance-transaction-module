import { HttpException, HttpStatus } from "@nestjs/common";

export class OverpaymentException extends HttpException {
  constructor(remaining: number) {
    super(
      `Payment amount exceeds remaining balance. Remaining: ${remaining.toFixed(2)}`,
      HttpStatus.CONFLICT
    );
  }
}
