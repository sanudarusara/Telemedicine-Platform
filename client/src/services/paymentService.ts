// Payment Service API client — routes through API Gateway at /api/payments

import apiClient, { extractErrorMessage } from "@/services/api/apiClient";

function throwErr(err: unknown): never {
  throw new Error(extractErrorMessage(err));
}

export type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export interface Payment {
  _id: string;
  appointmentId?: string;
  patientId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: "stripe" | "payhere";
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentPayload {
  userId?: string;
  appointmentId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  description?: string;
}

export interface CreatePaymentResponse {
  paymentId: string;
  clientSecret?: string;
  checkoutUrl?: string;
}

/** Create a new payment intent (Stripe or PayHere) */
export async function createPayment(
  payload: CreatePaymentPayload
): Promise<CreatePaymentResponse> {
  try {
    const { data } = await apiClient.post<CreatePaymentResponse>("/api/payments/create", payload);
    return data;
  } catch (err) { throwErr(err); }
}

/** Get a single payment by ID */
export async function getPaymentById(id: string): Promise<Payment> {
  try {
    const { data } = await apiClient.get<Payment>(`/api/payments/${id}`);
    return (data as any).data ?? data;
  } catch (err) { throwErr(err); }
}

/** Admin: get all payments */
export async function getAllPayments(): Promise<Payment[]> {
  try {
    const { data } = await apiClient.get<Payment[] | { data: Payment[] }>("/api/payments");
    return (data as any).data ?? (data as Payment[]);
  } catch (err) { throwErr(err); }
}

/** Admin: update payment status */
export async function updatePaymentStatus(id: string, status: PaymentStatus): Promise<Payment> {
  try {
    const { data } = await apiClient.patch<Payment>(`/api/payments/${id}/status`, { status });
    return (data as any).data ?? data;
  } catch (err) { throwErr(err); }
}

/** Confirm / capture a payment after client-side authorisation */
export async function confirmPayment(paymentId: string): Promise<Payment> {
  try {
    const { data } = await apiClient.post<Payment>(`/api/payments/confirm/${paymentId}`);
    return data;
  } catch (err) { throwErr(err); }
}

/** Create a PayHere payment session */
export async function createPayherePayment(
  payload: CreatePaymentPayload
): Promise<CreatePaymentResponse> {
  try {
    const { data } = await apiClient.post<CreatePaymentResponse>("/api/payments/payhere-create", payload);
    return data;
  } catch (err) { throwErr(err); }
}

/** Get all payments (admin) or own payments */
export async function getPayments(): Promise<Payment[]> {
  try {
    const { data } = await apiClient.get<Payment[]>("/api/payments");
    return data;
  } catch (err) { throwErr(err); }
}
