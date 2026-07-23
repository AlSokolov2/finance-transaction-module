import axios from "axios";
import type {
  CreatePaymentRequest,
  PaymentResponse,
  OrderReport,
} from "../types";

const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

export async function addPayment(
  data: CreatePaymentRequest
): Promise<PaymentResponse> {
  const { data: result } = await api.post<PaymentResponse>("/payments", data);
  return result;
}

export async function getReport(): Promise<OrderReport> {
  const { data } = await api.get<OrderReport>("/orders/report");
  return data;
}
