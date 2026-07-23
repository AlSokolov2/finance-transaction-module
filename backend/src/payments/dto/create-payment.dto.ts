import { IsUUID, IsNumber, IsString, Min, Length } from "class-validator";

export class CreatePaymentDto {
  @IsUUID("4")
  orderId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @Length(1, 64)
  idempotencyKey: string;
}
